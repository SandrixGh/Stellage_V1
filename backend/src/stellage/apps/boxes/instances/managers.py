import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from stellage.apps.boxes.assets.repositories import BoxAssetRepository
from stellage.apps.boxes.assets.tasks import delete_asset_objects
from stellage.apps.boxes.instances.cache_managers import InstanceCacheManager
from stellage.apps.boxes.instances.repositories import BoxInstanceRepository
from stellage.apps.boxes.instances.schemas import (
    BoxInstanceCreate,
    BoxInstanceWithTemplate,
    BoxPositionUpdate,
    BoxTextContent,
)
from stellage.apps.shelves.cache_managers import ShelfCacheManager


class InstanceManager:
    def __init__(
        self,
        repository: Annotated[
            BoxInstanceRepository,
            Depends(BoxInstanceRepository)
        ],
        asset_repository: Annotated[
            BoxAssetRepository,
            Depends(BoxAssetRepository)
        ],
        instance_cache_manager: Annotated[
            InstanceCacheManager,
            Depends(InstanceCacheManager)
        ],
        shelf_cache_manager: Annotated[
            ShelfCacheManager,
            Depends(ShelfCacheManager)
        ]
    ) -> None:
        self.shelf_cache_manager = shelf_cache_manager
        self.instance_cache_manager = instance_cache_manager
        self.repository = repository
        self.asset_repository = asset_repository


    async def create_instance(
        self,
        user_id: uuid.UUID,
        data: BoxInstanceCreate
    ) -> BoxInstanceWithTemplate:
        instance = await self.repository.create_instance(
            user_id=user_id,
            data=data,
        )

        if data.shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=instance.user_id,
                shelf_id=instance.shelf_id,
            )

        await self.instance_cache_manager.store_instance(
            instance=instance,
        )

        return instance


    async def refresh_old_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        instance = await self.instance_cache_manager.get_instance(
            instance_id=instance_id,
            user_id=user_id
        )

        if not instance:
            instance = await self.repository.get_box_instance_by_id(
                user_id=user_id,
                instance_id=instance_id
            )

        if instance and instance.shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=user_id,
                shelf_id=instance.shelf_id,
            )


    async def move_to_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceWithTemplate:
        await self.refresh_old_shelf(
            user_id=user_id,
            instance_id=instance_id,
        )

        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=user_id,
        )

        updated_instance = await self.repository.move_to_shelf(
            user_id=user_id,
            shelf_id=shelf_id,
            instance_id=instance_id,
        )

        if shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=user_id,
                shelf_id=shelf_id,
            )

        await self.instance_cache_manager.store_instance(
            instance=updated_instance
        )

        return updated_instance


    async def update_position(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        data: BoxPositionUpdate,
    ) -> BoxInstanceWithTemplate:
        # Drop the stale cached shelf + instance before persisting the move.
        await self.refresh_old_shelf(
            user_id=user_id,
            instance_id=instance_id,
        )

        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=user_id,
        )

        updated_instance = await self.repository.update_position(
            user_id=user_id,
            instance_id=instance_id,
            data=data,
        )

        # A swap may have moved a second box on the same shelf, so invalidate
        # the shelf cache again now that positions are committed.
        if updated_instance.shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=user_id,
                shelf_id=updated_instance.shelf_id,
            )

        await self.instance_cache_manager.store_instance(
            instance=updated_instance
        )

        return updated_instance


    async def update_box(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        content: BoxTextContent | None,
        update_content: bool,
    ) -> BoxInstanceWithTemplate:
        """Сбрасывает кэши экземпляра/полки и возвращает свежий снимок. content
        пишется только когда update_content=True (иначе правка шаблона не должна
        затирать содержимое); при False — просто перечитываем актуальные данные."""
        await self.refresh_old_shelf(
            user_id=user_id,
            instance_id=instance_id,
        )
        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=user_id,
        )

        if update_content:
            box = await self.repository.update_content(
                user_id=user_id,
                instance_id=instance_id,
                content=content.model_dump() if content is not None else None,
            )
        else:
            box = await self.repository.get_box_instance_by_id(
                user_id=user_id,
                instance_id=instance_id,
            )

        if not box:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box not found or access denied",
            )

        await self.instance_cache_manager.store_instance(instance=box)
        return box


    async def unseal_box(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate:
        """Распечатывает коробку и сбрасывает кэши полки/экземпляра, чтобы новый
        статус (и открывшийся для чужих глаз контент) сразу подхватился везде."""
        await self.refresh_old_shelf(
            user_id=user_id,
            instance_id=instance_id,
        )
        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=user_id,
        )

        box = await self.repository.unseal_instance(
            user_id=user_id,
            instance_id=instance_id,
        )

        await self.instance_cache_manager.store_instance(instance=box)
        return box


    async def gift_box(
        self,
        giver_id: uuid.UUID,
        recipient_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate:
        """Дарит коробку получателю. Инвалидирует кэш экземпляра у ОБОИХ
        (даритель — ключ больше не валиден; получатель — мог держать старый
        снимок), не записывая новый снимок вручную: кэш наполнится свежими
        данными при первом GET. Так исключаем гонку delete-before-write, при
        которой параллельное чтение закэшировало бы устаревшее значение."""
        await self.refresh_old_shelf(
            user_id=giver_id,
            instance_id=instance_id,
        )
        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=giver_id,
        )

        box = await self.repository.transfer_instance(
            giver_id=giver_id,
            recipient_id=recipient_id,
            instance_id=instance_id,
        )

        # Инвалидируем кэш получателя (без записи снимка) — свежие данные
        # подтянет его первый GET из БД.
        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=recipient_id,
        )
        return box


    async def get_instances(
        self,
        user_id: uuid.UUID,
    ) -> list[BoxInstanceWithTemplate]:
        return await self.repository.get_box_instances(
            user_id=user_id,
        )


    async def get_instance_by_id(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate | None:
        cached = await self.instance_cache_manager.get_instance(
            user_id=user_id,
            instance_id=instance_id,
        )
        if cached:
            return cached

        instance = await self.repository.get_box_instance_by_id(
            user_id=user_id,
            instance_id=instance_id,
        )

        if instance:
            await self.instance_cache_manager.store_instance(
                instance=instance
            )

        return instance


    async def delete_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        await self.refresh_old_shelf(
            user_id=user_id,
            instance_id=instance_id,
        )

        # Порядок важен: физическое удаление объектов в S3 ставим в очередь
        # ТОЛЬКО после успешного удаления коробки. Иначе (если задача уходила
        # до commit'а) сбой delete_box_instance оставлял бы «живую» коробку с
        # уже безвозвратно удалёнными из S3 ассетами.
        # 1) Помечаем ассеты DELETING (данные пока целы; FK SET NULL сохранит
        #    строки — их подхватит sweeper, даже если что-то сорвётся).
        asset_ids = await self.asset_repository.mark_deleting_for_instance(
            instance_id=instance_id,
            owner_id=user_id,
        )

        # 2) Удаляем саму коробку. Упадёт здесь — объекты в S3 ещё на месте,
        #    ассеты можно вернуть в READY; ничего не потеряно.
        await self.repository.delete_box_instance(
            user_id=user_id,
            instance_id=instance_id,
        )

        await self.instance_cache_manager.delete_instance(
            user_id=user_id,
            instance_id=instance_id,
        )

        # 3) Коробки уже нет — теперь безопасно чистить объекты в S3.
        if asset_ids:
            delete_asset_objects.delay(
                [str(asset_id) for asset_id in asset_ids]
            )