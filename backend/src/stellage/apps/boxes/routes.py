import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from starlette import status

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.instances.schemas import (
    BoxInstanceCreate,
    BoxInstanceWithTemplate,
    BoxPositionUpdate,
    CustomBoxCreate,
)
from stellage.apps.boxes.instances.services import InstanceService
from stellage.apps.boxes.templates.schemas import BoxTemplateReturn, BoxTemplateCreate, BoxTemplateReturnWithInstances
from stellage.apps.boxes.templates.services import TemplateService
from stellage.database.enums.box_rarity import BoxRarity

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
    ]
) -> list[BoxInstanceWithTemplate]:
    return await service.get_instances(user=user)


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
            creator_id=user.id,
        )
    )
    return await instance_service.create_instance(
        user=user,
        data=BoxInstanceCreate(
            template_id=template.id,
            shelf_id=None,
            content=data.content,
        ),
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
    return await service.create_template(
        data=data
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
    shelf_id: Optional[uuid.UUID] = None
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