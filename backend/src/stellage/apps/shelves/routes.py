import uuid
from typing import Annotated

from fastapi import APIRouter, status, Depends
from starlette.responses import JSONResponse

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.shelves.dependecies import get_current_main_shelf
from stellage.apps.shelves.schemas import ShelfReturnData, CreateShelf
from stellage.apps.shelves.services import ShelfService

router = APIRouter(
    prefix="/shelf",
    tags=["Shelf"]
)

@router.post(
    path="/create-shelf",
    status_code=status.HTTP_200_OK,
    response_model=ShelfReturnData
)
async def create_shelf(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        ShelfService,
        Depends(ShelfService)
    ],
    shelf: CreateShelf
) -> ShelfReturnData:
    return await service.create_shelf(
        user=user,
        shelf=shelf,
    )


@router.get(
    path="/get-shelves",
    status_code=status.HTTP_200_OK,
    response_model=list[ShelfReturnData]
)
async def get_shelves(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        ShelfService,
        Depends(ShelfService)
    ],
) -> list[ShelfReturnData]:
    return await service.get_shelves(
        user=user,
    )


@router.get(
    path="/main-shelf",
    status_code=status.HTTP_200_OK,
    response_model=ShelfReturnData
)
async def get_main_shelf(
    main_shelf: Annotated[
        ShelfReturnData,
        Depends(get_current_main_shelf)
    ]
) -> ShelfReturnData:
    return main_shelf


@router.get(
    path="/get-shelf-by-id",
    status_code=status.HTTP_200_OK,
    response_model=ShelfReturnData
)
async def get_shelf_by_id(
    shelf_id: uuid.UUID,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        ShelfService,
        Depends(ShelfService)
    ],
) -> ShelfReturnData:
    return await service.get_shelf_by_id(
        user=user,
        shelf_id=shelf_id
    )


@router.delete(
    path="/delete-shelf",
    status_code=status.HTTP_200_OK,
)
async def delete_shelf(
    shelf_id: uuid.UUID,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        ShelfService,
        Depends(ShelfService)
    ],
) -> JSONResponse:
    return await service.delete_shelf(
        user=user,
        shelf_id=shelf_id,
    )