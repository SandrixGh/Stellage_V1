import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from starlette import status

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.instances.schemas import BoxInstanceReturn, BoxInstanceCreate
from stellage.apps.boxes.instances.services import InstanceService
from stellage.apps.boxes.templates.schemas import BoxTemplateReturn, BoxTemplateCreate, BoxTemplateReturnWithInstances
from stellage.apps.boxes.templates.services import TemplateService

router = APIRouter(
    prefix="/boxes",
    tags=["Boxes"]
)

@router.get(
    path="/get-box-instances",
    response_model=list[BoxInstanceReturn],
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
) -> list[BoxInstanceReturn]:
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
    response_model=BoxInstanceReturn,
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
) -> BoxInstanceReturn:
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
    response_model=BoxInstanceReturn,
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
) -> BoxInstanceReturn:
    return await service.create_instance(
        user=user,
        data=data
    )


@router.post(
    path="/create-box-template",
    response_model=BoxTemplateReturn,
    status_code=status.HTTP_201_CREATED,
)
async def create_box_template(
    service: Annotated[
        TemplateService,
        Depends(TemplateService),
    ],
    data: BoxTemplateCreate
) -> BoxTemplateReturn:
    return await service.create_template(
        data=data
    )


@router.get(
    path="/move-box-to-shelf",
    response_model=BoxInstanceReturn,
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
    shelf_id: uuid.UUID | None
) -> BoxInstanceReturn:
    return await service.move_to_shelf(
        user=user,
        instance_id=instance_id,
        shelf_id=shelf_id,
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