import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from starlette.responses import JSONResponse

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.shelves.managers import ShelfManager
from stellage.apps.shelves.schemas import CreateShelf, ShelfReturnData, ShelfWithBoxInstances


class ShelfService:
    def __init__(
        self,
        manager: Annotated[
            ShelfManager,
            Depends(ShelfManager)
        ]
    ):
        self.manager = manager


    async def get_shelves(
        self,
        user: UserVerifySchema
    ) -> list[ShelfReturnData]:
        return await self.manager.get_shelves(user_id=user.id)


    async def create_shelf(
        self,
        user: UserVerifySchema,
        shelf: CreateShelf,
    ) -> ShelfReturnData:
        if len(await self.get_shelves(user=user)) >= 2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You already have 2 stellages"
            )
        return await self.manager.create_shelf(
            user_id=user.id,
            shelf=shelf
        )


    async def get_main_shelf(
        self,
        user: UserVerifySchema,
    ) -> ShelfReturnData:
        shelf = await self.manager.get_main_shelf(user_id=user.id)
        if not shelf:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Main shelf not found or not exist"
            )
        return shelf


    async def get_main_shelf_with_boxes(
        self,
        user: UserVerifySchema,
    ) -> ShelfWithBoxInstances:
        shelf = await self.manager.get_main_shelf_with_boxes(
            user_id=user.id,
        )
        if not shelf:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Main shelf not found or not exist"
            )
        return shelf


    async def get_shelf_by_id(
        self,
        user: UserVerifySchema,
        shelf_id: uuid.UUID,
    ) -> ShelfReturnData:
        shelf = await self.manager.get_shelf_by_id(
            user_id=user.id,
            shelf_id=shelf_id,
        )

        if not shelf:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shelf not found"
            )

        return shelf


    async def get_shelf_with_boxes(
        self,
        user: UserVerifySchema,
        shelf_id: uuid.UUID,
    ) -> ShelfWithBoxInstances:
        shelf = await self.manager.get_shelf_with_boxes(
            user_id=user.id,
            shelf_id=shelf_id,
        )
        if not shelf:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shelf not found"
            )
        return shelf


    async def delete_shelf(
        self,
        user: UserVerifySchema,
        shelf_id: uuid.UUID
    ) -> JSONResponse:
        await self.manager.delete_shelf(
            user_id=user.id,
            shelf_id=shelf_id,
        )

        response = JSONResponse(
            content={"detail": "Shelf was deleted successfully"}
        )

        return response