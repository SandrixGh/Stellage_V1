import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from starlette import status

from stellage.apps.auth.depends import get_current_user, get_optional_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.instances.public_schemas import BoxPublicView
from stellage.apps.boxes.instances.schemas import (
    BoxInstanceCreate,
    BoxInstanceWithTemplate,
    BoxPositionUpdate,
    BoxUpdate,
    CustomBoxCreate,
    GiftBoxRequest,
)
from stellage.apps.boxes.instances.services import InstanceService
from stellage.apps.boxes.templates.schemas import (
    BoxTemplateCreate,
    BoxTemplatePatch,
    BoxTemplateReturn,
    BoxTemplateReturnWithInstances,
)
from stellage.apps.boxes.templates.services import TemplateService
from stellage.core.rate_limit import rate_limit
from stellage.database.enums.box_rarity import BoxRarity

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/boxes",
    tags=["Boxes"]
)

@router.get(
    path="/get-box-instances",
    response_model=list[BoxInstanceWithTemplate],
    status_code=status.HTTP_200_OK,
)
async def get_box_instances(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[BoxInstanceWithTemplate]:
    return await service.get_instances(user=user, limit=limit, offset=offset)


@router.get(
    path="/get-box-templates",
    response_model=list[BoxTemplateReturn],
    status_code=status.HTTP_200_OK,
)
async def get_box_templates(
    service: Annotated[
        TemplateService,
        Depends(TemplateService),
    ]
) -> list[BoxTemplateReturn]:
    return await service.get_templates()


@router.get(
    path="/get-box-instance",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_200_OK,
)
async def get_box_instance(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    instance_id: uuid.UUID
) -> BoxInstanceWithTemplate:
    return await service.get_instance_by_id(
        user=user,
        instance_id=instance_id,
    )


@router.get(
    path="/box-view",
    response_model=BoxPublicView,
    status_code=status.HTTP_200_OK,
)
async def get_box_view(
    viewer: Annotated[
        UserVerifySchema | None,
        Depends(get_optional_current_user),
    ],
    service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    instance_id: uuid.UUID,
) -> BoxPublicView:
    # Публичный детальный просмотр коробки (отдельная страница /box/:id).
    # Отдаёт коробку + карточку владельца, если зритель вправе её видеть;
    # иначе — 404 (без оракула о существовании чужой приватной коробки).
    return await service.get_public_box_view(
        viewer=viewer,
        instance_id=instance_id,
    )


@router.get(
    path="/get-box-template",
    response_model=BoxTemplateReturnWithInstances,
    status_code=status.HTTP_200_OK,
)
async def get_box_template(
    service: Annotated[
        TemplateService,
        Depends(TemplateService),
    ],
    template_id: uuid.UUID
) -> BoxTemplateReturnWithInstances:
    return await service.get_template_with_instances(
        template_id=template_id,
    )


@router.post(
    path="/create-box-instance",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_201_CREATED,
)
async def create_box_instance(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    data: BoxInstanceCreate
) -> BoxInstanceWithTemplate:
    return await service.create_instance(
        user=user,
        data=data
    )


@router.post(
    path="/create-box",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_201_CREATED,
)
async def create_box(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    template_service: Annotated[
        TemplateService,
        Depends(TemplateService),
    ],
    instance_service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    data: CustomBoxCreate,
) -> BoxInstanceWithTemplate:
    # Создаём новый шаблон под коробку, затем кладём один экземпляр в инвентарь.
    # Редкость: суперюзеры могут задать любую (data.rarity); обычным пользователям
    # сервер форсит COMMON (см. модерацию в CLAUDE.md).
    rarity = data.rarity if (user.is_superuser and data.rarity) else BoxRarity.COMMON
    template = await template_service.create_template(
        data=BoxTemplateCreate(
            title=data.title,
            description=data.description,
            price=data.price,
            currency=data.currency,
            rarity=rarity,
        ),
        creator_id=user.id,
    )
    # Шаблон и экземпляр создаются разными транзакциями (репозитории коммитят
    # каждый сам). Если создание экземпляра сорвётся, компенсируем — удаляем
    # только что созданный шаблон, чтобы не оставлять orphan в каталоге.
    try:
        return await instance_service.create_instance(
            user=user,
            data=BoxInstanceCreate(
                template_id=template.id,
                shelf_id=None,
                content=data.content,
            ),
        )
    except Exception:
        # Компенсация не должна подменять исходную ошибку: если удаление
        # шаблона тоже сорвётся, клиент получит сообщение о нём вместо
        # настоящей причины сбоя. Логируем и пробрасываем оригинал —
        # осиротевший шаблон переживём, потерянную диагностику нет.
        try:
            await template_service.delete_template(
                template_id=template.id,
                creator_id=user.id,
            )
        except Exception:
            logger.exception(
                "Не удалось удалить осиротевший шаблон %s после сбоя "
                "создания экземпляра",
                template.id,
            )
        raise


@router.patch(
    path="/update-box",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_200_OK,
)
async def update_box(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    template_service: Annotated[
        TemplateService,
        Depends(TemplateService),
    ],
    instance_service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    data: BoxUpdate,
    instance_id: uuid.UUID,
) -> BoxInstanceWithTemplate:
    # Сначала убеждаемся, что коробка принадлежит пользователю (иначе 404).
    box = await instance_service.get_instance_by_id(
        user=user,
        instance_id=instance_id,
    )

    # Поля шаблона правит только создатель коробки (update_template форсит
    # creator_id == user.id). Редкость меняем только суперюзеру.
    template_fields = data.model_dump(
        include={"title", "description", "price", "currency", "rarity"},
        exclude_none=True,
    )
    if not user.is_superuser:
        template_fields.pop("rarity", None)

    if template_fields:
        await template_service.update_template(
            template_id=box.template_id,
            creator_id=user.id,
            data=BoxTemplatePatch(**template_fields),
        )

    # content обновляем, только если он реально пришёл в запросе (иначе не трогаем).
    update_content = "content" in data.model_fields_set
    return await instance_service.update_box(
        user=user,
        instance_id=instance_id,
        content=data.content,
        update_content=update_content,
    )


@router.post(
    path="/unseal-box",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_200_OK,
)
async def unseal_box(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    instance_service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    instance_id: uuid.UUID,
) -> BoxInstanceWithTemplate:
    # Распечатывание коробки владельцем — необратимое коллекционное событие
    # («не вскрыто» → «вскрыто»). Запечатанность больше НЕ влияет на видимость
    # контента: чужой доступ решает can_view_box_content (public + публичная
    # полка), а владелец видит содержимое всегда, запечатана коробка или нет.
    return await instance_service.unseal_box(
        user=user,
        instance_id=instance_id,
    )


@router.post(
    path="/gift-box",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=20, window_seconds=60))],
)
async def gift_box(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    instance_service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    data: GiftBoxRequest,
    instance_id: uuid.UUID,
) -> BoxInstanceWithTemplate:
    # Дарение коробки другому пользователю: смена владельца + снятие с полки
    # дарителя + уведомление получателю. Дарить можно только свою коробку.
    return await instance_service.gift_box(
        giver=user,
        instance_id=instance_id,
        to_username=data.to_username,
    )


@router.post(
    path="/create-box-template",
    response_model=BoxTemplateReturn,
    status_code=status.HTTP_201_CREATED,
)
async def create_box_template(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        TemplateService,
        Depends(TemplateService),
    ],
    data: BoxTemplateCreate
) -> BoxTemplateReturn:
    # creator_id всегда = текущий пользователь (не из тела запроса).
    return await service.create_template(
        data=data,
        creator_id=user.id,
    )


@router.post(
    path="/move-box-to-shelf",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_200_OK,
)
async def move_to_shelf(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    instance_id: uuid.UUID,
    shelf_id: uuid.UUID | None = None
) -> BoxInstanceWithTemplate:
    return await service.move_to_shelf(
        user=user,
        instance_id=instance_id,
        shelf_id=shelf_id,
    )


@router.post(
    path="/update-box-position",
    response_model=BoxInstanceWithTemplate,
    status_code=status.HTTP_200_OK,
)
async def update_box_position(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    data: BoxPositionUpdate,
    instance_id: uuid.UUID,
) -> BoxInstanceWithTemplate:
    return await service.update_position(
        user=user,
        instance_id=instance_id,
        data=data,
    )


@router.delete(
    path="/delete-box-instance",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_box_instance(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        InstanceService,
        Depends(InstanceService),
    ],
    instance_id: uuid.UUID,
) -> None:
    return await service.delete_instance(
        user=user,
        instance_id=instance_id,
    )