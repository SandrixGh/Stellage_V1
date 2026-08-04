import uuid
from typing import Annotated

from fastapi import Depends

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.assets.managers import AssetManager
from stellage.apps.boxes.assets.schemas import (
    AssetDownloadUrl,
    AssetUploadInitiate,
    AssetUploadTarget,
    BoxAssetRead,
)


class AssetService:
    def __init__(
        self,
        manager: Annotated[
            AssetManager,
            Depends(AssetManager)
        ]
    ):
        self.manager = manager

    async def initiate_upload(
        self,
        user: UserVerifySchema,
        data: AssetUploadInitiate,
    ) -> AssetUploadTarget:
        return await self.manager.initiate_upload(
            user_id=user.id,
            data=data,
        )

    async def complete_upload(
        self,
        user: UserVerifySchema,
        asset_id: uuid.UUID,
    ) -> BoxAssetRead:
        return await self.manager.complete_upload(
            user_id=user.id,
            asset_id=asset_id,
        )

    async def get_download_url(
        self,
        viewer: UserVerifySchema | None,
        asset_id: uuid.UUID,
    ) -> AssetDownloadUrl:
        return await self.manager.get_download_url(
            viewer_id=viewer.id if viewer else None,
            asset_id=asset_id,
        )

    async def list_box_assets(
        self,
        viewer: UserVerifySchema | None,
        instance_id: uuid.UUID,
    ) -> list[BoxAssetRead]:
        return await self.manager.list_box_assets(
            viewer_id=viewer.id if viewer else None,
            instance_id=instance_id,
        )

    async def delete_asset(
        self,
        user: UserVerifySchema,
        asset_id: uuid.UUID,
    ) -> None:
        return await self.manager.delete_asset(
            user_id=user.id,
            asset_id=asset_id,
        )
