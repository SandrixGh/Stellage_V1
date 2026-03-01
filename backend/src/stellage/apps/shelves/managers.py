import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from .cache_managers import ShelfCacheManager
from .repositories import ShelfRepository
from .schemas import CreateShelf, ShelfReturnData
from ..auth.schemas import UserVerifySchema


class ShelfManager:
    def __init__(
        self,
        repository: Annotated[
            ShelfRepository,
            Depends(ShelfRepository)
        ],
        cache_manager: Annotated[
            ShelfCacheManager,
            Depends(ShelfCacheManager)
        ]
    ) -> None:
        self.repository = repository
        self.cache_manager = cache_manager


    async def create_shelf(
        self,
        user_id: uuid.UUID,
        shelf: CreateShelf,
    ) -> ShelfReturnData:
        is_main_shelf: bool = shelf.is_main

        created_shelf = await self.repository.create_shelf(
            user_id=user_id,
            shelf=shelf
        )

        if is_main_shelf:
            await self.cache_manager.refresh_main_shelf(
                user_id=user_id,
                shelf=created_shelf,
            )

        await self.cache_manager.store_shelf(shelf=created_shelf)

        return created_shelf


    async def get_shelves(
        self,
        user_id: uuid.UUID,
    ) -> list[ShelfReturnData]:
        return await self.repository.get_shelves(user_id=user_id)


    async def get_main_shelf(
        self,
        user: UserVerifySchema,
    ) -> ShelfReturnData | None:
        shelf_cached = await self.cache_manager.get_main_shelf(
            user_id=user.id
        )

        if shelf_cached:
            return shelf_cached

        shelf_db = await self.repository.get_main_shelf(
            user_id=user.id
        )

        if shelf_db:
            await self.cache_manager.store_main_shelf(shelf=shelf_db)
            await self.cache_manager.store_shelf(shelf=shelf_db)

        return shelf_db


    async def get_shelf_by_id(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
    ) -> ShelfReturnData | None:
        shelf_cached = await self.cache_manager.get_shelf(
            user_id=user_id,
            shelf_id=shelf_id
        )

        if shelf_cached:
            return shelf_cached

        shelf_db = await self.repository.get_shelf_by_id(
            user_id=user_id,
            shelf_id=shelf_id
        )

        if shelf_db:
            await self.cache_manager.store_shelf(
                shelf=shelf_db
            )

        return shelf_db


    async def delete_shelf(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID
    ) -> None:
        await self.cache_manager.delete_main_shelf(
            user_id=user_id
        )

        await self.cache_manager.delete_shelf(
            shelf_id=shelf_id,
            user_id=user_id,
        )

        new_main_id = await self.repository.delete_shelf(
            user_id=user_id,
            shelf_id=shelf_id,
        )

        if new_main_id:
            await self.cache_manager.delete_shelf(
                shelf_id=new_main_id,
                user_id=user_id
            )