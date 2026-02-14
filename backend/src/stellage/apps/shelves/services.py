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
        if shelf.is_main:
            await self.manager.reset_main_shelf(
                user_id=user.id,
            )

        created_shelf = await self.manager.create_shelf(
            user_id=user.id,
            shelf=shelf
        )

        await self.manager.store_shelf_to_redis(
            shelf=created_shelf
        )

        return created_shelf


    async def get_shelves(
        self,
        user: UserVerifySchema
    ) -> list[ShelfReturnData]:
        return await self.manager.get_shelves(user_id=user.id)