from typing import Annotated

from fastapi import Depends

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.shelves.schemas import ShelfReturnData
from stellage.apps.shelves.services import ShelfService


async def get_current_main_shelf(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        ShelfService,
        Depends(ShelfService)
    ]
) -> ShelfReturnData:
    return await service.get_main_shelf(user=user)