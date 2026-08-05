import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, selectinload
from starlette import status

from stellage.apps.boxes.instances.schemas import (
    BoxInstanceCreate,
    BoxInstanceWithTemplate,
    BoxPositionUpdate,
)
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.enums.asset_status import AssetStatusEnum
from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.visibility import VisibilityEnum
from stellage.database.models import BoxAsset, BoxInstance, BoxTemplate, Shelf, User


def _to_visibility_enum(val: object) -> VisibilityEnum:
    if isinstance(val, VisibilityEnum):
        return val
    if isinstance(val, str):
        if val in VisibilityEnum.__members__:
            return VisibilityEnum[val]
        try:
            return VisibilityEnum(val)
        except ValueError:
            pass
    return VisibilityEnum.PRIVATE


def _to_sealing_enum(val: object) -> SealingEnum:
    if isinstance(val, SealingEnum):
        return val
    if isinstance(val, str):
        if val in SealingEnum.__members__:
            return SealingEnum[val]
        try:
            return SealingEnum(val)
        except ValueError:
            pass
    return SealingEnum.SEALED


class BoxInstanceRepository:
    def __init__(
        self,
        db: Annotated[
            DBDependency,
            Depends(DBDependency)
        ]
    ) -> None:
        self.db = db
        self.instance_model = BoxInstance

    def _ready_assets_loader(self):
        """Подгружает только READY-ассеты: PENDING/DELETING наружу не выходят.
        Обязателен в каждом запросе, который валидируется в BoxInstanceReturn,
        иначе async lazy-load упадёт на поле assets."""
        return selectinload(
            self.instance_model.assets.and_(
                BoxAsset.status == AssetStatusEnum.READY
            )
        )


    # Сколько раз пересчитать serial_number и повторить insert при гонке
    # (уникальное ограничение uq_box_instances_template_serial).
    _SERIAL_RETRY_ATTEMPTS = 5

    async def create_instance(
        self,
        user_id: uuid.UUID,
        data: BoxInstanceCreate,
    ) -> BoxInstanceWithTemplate:
        async with self.db.db_session() as session:
            # IDOR-защита: шаблон обязан существовать, а полка (если указана) —
            # принадлежать создателю. Иначе можно было бы размножать чужой
            # шаблон (порча нумерации серий) или класть коробку в чужой стеллаж.
            template_res = await session.execute(
                select(BoxTemplate).where(BoxTemplate.id == data.template_id)
            )
            template = template_res.scalar_one_or_none()
            if template is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Template not found",
                )

            # Оплата StellaCoins для платных шаблонов
            price_coins = int(template.price) if template.price else 0
            if price_coins > 0:
                buyer_res = await session.execute(
                    select(User).where(User.id == user_id).with_for_update()
                )
                buyer = buyer_res.scalar_one_or_none()
                if buyer is None or buyer.stella_coins < price_coins:
                    current_coins = buyer.stella_coins if buyer else 0
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Недостаточно Stellacoin на балансе ({current_coins} из {price_coins})",
                    )

                # Списываем монеты у покупателя
                buyer.stella_coins -= price_coins

                # Если шаблон создал другой пользователь — начисляем ему
                if template.creator_id and template.creator_id != user_id:
                    creator_res = await session.execute(
                        select(User).where(User.id == template.creator_id).with_for_update()
                    )
                    creator = creator_res.scalar_one_or_none()
                    if creator:
                        creator.stella_coins += price_coins

            if data.shelf_id is not None:
                owned_shelf = await session.execute(
                    select(Shelf.id).where(
                        Shelf.id == data.shelf_id,
                        Shelf.user_id == user_id,
                    )
                )
                if owned_shelf.scalar_one_or_none() is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Shelf not found or access denied",
                    )

            base_data = data.model_dump()
            base_data["user_id"] = user_id
            if base_data.get("is_public") is not None:
                base_data["is_public"] = _to_visibility_enum(base_data["is_public"]).name
            if base_data.get("is_sealed") is not None:
                base_data["is_sealed"] = _to_sealing_enum(base_data["is_sealed"]).name

            # serial = max(serial)+1 в пределах шаблона. При параллельном
            # создании два запроса могут получить одинаковый serial — теперь это
            # ловит уникальное ограничение, и мы просто пересчитываем и повторяем
            # (а не отдаём дубль или 400).
            serial_subquery = (
                select(
                    func.coalesce(
                        func.max(self.instance_model.serial_number),
                        0,
                    ) + 1
                )
                .where(self.instance_model.template_id == data.template_id)
                .scalar_subquery()
            )

            for attempt in range(self._SERIAL_RETRY_ATTEMPTS):
                create_query = (
                    insert(self.instance_model)
                    .values(**base_data, serial_number=serial_subquery)
                    .returning(self.instance_model.id)
                )
                try:
                    result = await session.execute(create_query)
                    new_instance_id = result.scalar_one()

                    select_query = (
                        select(self.instance_model)
                        .where(self.instance_model.id == new_instance_id)
                        .options(
                            joinedload(self.instance_model.template),
                            self._ready_assets_loader(),
                        )
                    )
                    final_result = await session.execute(select_query)
                    instance = final_result.unique().scalar_one()

                    await session.commit()
                    return BoxInstanceWithTemplate.model_validate(instance)

                except IntegrityError as exc:
                    await session.rollback()
                    constraint = getattr(
                        getattr(exc.orig, "diag", None), "constraint_name", None
                    )
                    # Конфликт серии — повторяем (max пересчитается). Последняя
                    # попытка или другое нарушение — отдаём 400.
                    if (
                        constraint == "uq_box_instances_template_serial"
                        and attempt < self._SERIAL_RETRY_ATTEMPTS - 1
                    ):
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Box already exist",
                    ) from exc


    async def move_to_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceWithTemplate:
        async with self.db.db_session() as session:
            if shelf_id is not None:
                shelf_owner_query = (
                    select(Shelf.id)
                    .where(
                        Shelf.id == shelf_id,
                        Shelf.user_id == user_id,
                    )
                )
                owned_shelf = await session.execute(shelf_owner_query)
                if owned_shelf.scalar_one_or_none() is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Shelf not found or access denied"
                    )

            update_query = (
                update(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .values(
                    shelf_id=shelf_id,
                )
            )

            # Фильтр по user_id и в SELECT: чужой вызов (UPDATE затронул 0 строк)
            # честно получает 404, а не снимок чужой коробки (её content, шаблон,
            # метаданные ассетов). Иначе SELECT только по id вернул бы чужую.
            select_query = (
                select(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
            )

            try:
                await session.execute(update_query)

                result = await session.execute(select_query)

                box = result.unique().scalar_one_or_none()

                if not box:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Box not found or access denied"
                    )

                await session.commit()

                return BoxInstanceWithTemplate.model_validate(box)

            except IntegrityError as err:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Box on that shelf already exist"
                ) from err


    async def update_position(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        data: BoxPositionUpdate,
    ) -> BoxInstanceWithTemplate:
        async with self.db.db_session() as session:
            dragged_query = (
                select(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
            )
            dragged_result = await session.execute(dragged_query)
            dragged = dragged_result.scalar_one_or_none()

            if dragged is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Box not found or access denied"
                )

            if dragged.shelf_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Box is not placed on a shelf"
                )

            prev_row = dragged.shelf_row
            prev_col = dragged.shelf_col

            occupant_query = (
                select(self.instance_model)
                .where(
                    self.instance_model.shelf_id == dragged.shelf_id,
                    self.instance_model.shelf_row == data.shelf_row,
                    self.instance_model.shelf_col == data.shelf_col,
                    self.instance_model.id != dragged.id,
                )
            )
            occupant_result = await session.execute(occupant_query)
            occupant = occupant_result.scalar_one_or_none()

            try:
                if occupant is not None:
                    # Swap: park the occupant on a NULL sentinel first so the
                    # partial unique index never trips at a flush boundary,
                    # then move the dragged box, then settle the occupant on
                    # the dragged box's previous cell.
                    occupant.shelf_row = None
                    occupant.shelf_col = None
                    await session.flush()

                    dragged.shelf_row = data.shelf_row
                    dragged.shelf_col = data.shelf_col
                    await session.flush()

                    occupant.shelf_row = prev_row
                    occupant.shelf_col = prev_col
                    await session.flush()
                else:
                    dragged.shelf_row = data.shelf_row
                    dragged.shelf_col = data.shelf_col
                    await session.flush()

                # dragged уже проверен на принадлежность user_id выше; фильтр в
                # SELECT держит инвариант «наружу только своя коробка» на будущее.
                select_query = (
                    select(self.instance_model)
                    .where(
                        self.instance_model.user_id == user_id,
                        self.instance_model.id == instance_id,
                    )
                    .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
                )
                result = await session.execute(select_query)
                box = result.unique().scalar_one()

                await session.commit()

                return BoxInstanceWithTemplate.model_validate(box)

            except IntegrityError as err:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Box on that position already exist"
                ) from err


    async def update_content(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        content: dict | None,
    ) -> BoxInstanceWithTemplate:
        """Обновляет content экземпляра (владелец) и возвращает свежий снимок
        с подгруженным шаблоном — чтобы правки шаблона тоже сразу отразились."""
        async with self.db.db_session() as session:
            update_query = (
                update(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .values(content=content)
            )
            await session.execute(update_query)

            # user_id и в SELECT: иначе правка content чужой коробки (UPDATE
            # затронул 0 строк) всё равно вернула бы её снимок — утечка content
            # и шаблона. Фильтр даёт честный 404 для чужого экземпляра.
            select_query = (
                select(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
            )
            result = await session.execute(select_query)
            box = result.unique().scalar_one_or_none()

            if not box:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Box not found or access denied",
                )

            await session.commit()
            return BoxInstanceWithTemplate.model_validate(box)


    async def unseal_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate:
        """Распечатывает коробку владельца (SEALED → NOT_SEALED). Действие
        необратимо — как вскрытая настоящая коробка; повторный вызов на уже
        распечатанной просто вернёт актуальный снимок."""
        async with self.db.db_session() as session:
            update_query = (
                update(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .values(is_sealed=SealingEnum.NOT_SEALED)
            )
            await session.execute(update_query)

            # Фильтр по user_id и в SELECT: чужой вызов (UPDATE затронул 0 строк)
            # честно получает 404, а не чужую коробку.
            select_query = (
                select(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
            )
            result = await session.execute(select_query)
            box = result.unique().scalar_one_or_none()

            if not box:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Box not found or access denied",
                )

            await session.commit()
            return BoxInstanceWithTemplate.model_validate(box)


    async def transfer_instance(
        self,
        giver_id: uuid.UUID,
        recipient_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate:
        """Дарит коробку: меняет владельца и снимает её с полки дарителя
        (shelf_id/row/col → NULL — у нового владельца своя раскладка). UPDATE
        затрагивает 0 строк, если коробка не принадлежит дарителю → 404."""
        async with self.db.db_session() as session:
            update_query = (
                update(self.instance_model)
                .where(
                    self.instance_model.user_id == giver_id,
                    self.instance_model.id == instance_id,
                )
                .values(
                    user_id=recipient_id,
                    shelf_id=None,
                    shelf_row=None,
                    shelf_col=None,
                )
            )
            result = await session.execute(update_query)
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Box not found or access denied",
                )

            select_query = (
                select(self.instance_model)
                .where(self.instance_model.id == instance_id)
                .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
            )
            box = (await session.execute(select_query)).unique().scalar_one()
            await session.commit()
            return BoxInstanceWithTemplate.model_validate(box)


    async def get_box_instances(
        self,
        user_id: uuid.UUID,
        limit: int = 200,
        offset: int = 0,
    ) -> list[BoxInstanceWithTemplate]:
        # LIMIT/OFFSET: большой инвентарь не тянем целиком одним запросом и
        # тяжёлым payload'ом. Стабильный порядок по created_at,id — чтобы
        # страницы не «прыгали».
        async with self.db.db_session() as session:
            query = (
                select(self.instance_model)
                .where(self.instance_model.user_id == user_id)
                .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
                .order_by(
                    self.instance_model.created_at.desc(),
                    self.instance_model.id.desc(),
                )
                .limit(limit)
                .offset(offset)
            )

            result = await session.execute(query)
            boxes = list(result.unique().scalars().all())
            if not boxes:
                return []

            from stellage.database.models import BoxLike
            liked_stmt = select(BoxLike.instance_id, BoxLike.template_id).where(
                BoxLike.user_id == user_id
            )
            liked_rows = (await session.execute(liked_stmt)).all()
            liked_inst_ids = {r[0] for r in liked_rows if r[0]}
            liked_tpl_ids = {r[1] for r in liked_rows if r[1]}

            items = []
            for box in boxes:
                item = BoxInstanceWithTemplate.model_validate(box)
                item.is_liked = (box.id in liked_inst_ids) or (box.template_id in liked_tpl_ids)
                items.append(item)

            return items


    async def get_instance_with_owner_by_id(
        self,
        instance_id: uuid.UUID,
    ) -> tuple[BoxInstanceWithTemplate, User, bool] | None:
        """Читает коробку по id БЕЗ фильтра владельца — для публичного
        детального просмотра. Возвращает (коробка, владелец, is_public_shelf).
        Видимость решает вызывающий сервис через can_see_box; None — если
        коробки нет."""
        async with self.db.db_session() as session:
            query = (
                select(self.instance_model, User, Shelf.is_public)
                .join(User, self.instance_model.user_id == User.id)
                .outerjoin(Shelf, self.instance_model.shelf_id == Shelf.id)
                .where(self.instance_model.id == instance_id)
                .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
            )
            result = await session.execute(query)
            row = result.unique().first()
            if row is None:
                return None
            instance, owner, shelf_is_public = row
            return (
                BoxInstanceWithTemplate.model_validate(instance),
                owner,
                bool(shelf_is_public),
            )


    async def get_box_instance_by_id(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID
    ) -> BoxInstanceWithTemplate | None:
        async with self.db.db_session() as session:
            query = (
                select(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .options(
                    joinedload(self.instance_model.template),
                    self._ready_assets_loader(),
                )
            )

            result = await session.execute(query)

            box = result.unique().scalar_one_or_none()

            if box:
                item = BoxInstanceWithTemplate.model_validate(box)
                from stellage.database.models import BoxLike
                liked_stmt = select(BoxLike.id).where(
                    BoxLike.user_id == user_id,
                    or_(
                        BoxLike.instance_id == box.id,
                        BoxLike.template_id == box.template_id,
                    )
                )
                item.is_liked = (await session.execute(liked_stmt)).scalar() is not None
                return item

            return None


    async def delete_box_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        from stellage.database.models import BoxTemplate
        async with self.db.db_session() as session:
            # Получаем template_id перед удалением инстанса
            inst_stmt = select(self.instance_model.template_id).where(
                self.instance_model.user_id == user_id,
                self.instance_model.id == instance_id,
            )
            template_id = (await session.execute(inst_stmt)).scalar_one_or_none()

            query = (
                delete(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
            )
            await session.execute(query)

            # Если у кастомного шаблона пользователя больше не осталось экземпляров, удаляем сам шаблон из каталога
            if template_id:
                count_stmt = select(func.count(self.instance_model.id)).where(
                    self.instance_model.template_id == template_id
                )
                remaining = (await session.execute(count_stmt)).scalar_one()
                if remaining == 0:
                    await session.execute(
                        delete(BoxTemplate).where(
                            BoxTemplate.id == template_id,
                            BoxTemplate.creator_id == user_id,
                        )
                    )

            await session.commit()

    async def is_gift_participant(self, instance_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        from sqlalchemy import or_
        from stellage.database.models import Message
        async with self.db.db_session() as session:
            result = await session.execute(
                select(Message.id).where(
                    Message.gift_instance_id == instance_id,
                    or_(Message.sender_id == user_id, Message.recipient_id == user_id),
                ).limit(1)
            )
            return result.scalar_one_or_none() is not None

