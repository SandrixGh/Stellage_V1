from typing import Annotated

from fastapi import Depends, HTTPException, status

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
        is_main_shelf: bool = shelf.is_main
        if is_main_shelf:
            await self.manager.delete_main_shelf_cache(
                user_id=user.id
            )

        created_shelf = await self.manager.create_shelf(
            user_id=user.id,
            shelf=shelf
        )

        await self.manager.store_shelf_to_redis(
            shelf=created_shelf
        )

        if is_main_shelf:
            await self.manager.store_main_shelf_to_redis(shelf=created_shelf)

        return created_shelf


    async def get_shelves(
        self,
        user: UserVerifySchema
    ) -> list[ShelfReturnData]:
        return await self.manager.get_shelves(user_id=user.id)


    async def get_main_shelf(
        self,
        user: UserVerifySchema,
    ) -> ShelfReturnData:
        shelf_cached = await self.manager.get_main_shelf_from_cache(
            user_id=user.id
        )

        if shelf_cached:
            return shelf_cached

        shelf_db = await self.manager.get_main_shelf(
            user_id=user.id
        )

        if not shelf_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Main shelf not found or not exist"
            )

        await self.manager.store_main_shelf_to_redis(shelf=shelf_db)

        await self.manager.store_shelf_to_redis(shelf=shelf_db)

        return shelf_db