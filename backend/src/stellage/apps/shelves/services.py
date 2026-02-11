from typing import Annotated

from fastapi import Depends

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.shelves.managers import ShelfManager
from stellage.apps.shelves.schemas import CreateShelf, ShelfReturnData


class ShelfService:
    def __init__(
        self,
        manager: Annotated[
            ShelfManager,
            Depends(ShelfManager)
        ]
    ):
        self.manager = manager


    async def create_shelf(
        self,
        user: UserVerifySchema,
        shelf: CreateShelf,
    ) -> ShelfReturnData:
        created_shelf = await self.manager.create_shelf(
            user_id=user.id,
            shelf=shelf
        )

        await self.manager.store_shelf_to_redis(
            shelf_title=created_shelf.title,
            user_id=user.id,
            shelf_id=created_shelf.id,
        )

        return created_shelf

