import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from starlette import status

from stellage.apps.auth.depends import get_current_user, get_optional_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.assets.schemas import (
    AssetCompleteRequest,
    AssetDownloadUrl,
    AssetUploadInitiate,
    AssetUploadTarget,
    BoxAssetRead,
)
from stellage.apps.boxes.assets.services import AssetService
from stellage.core.rate_limit import rate_limit

router = APIRouter(
    prefix="/boxes",
    tags=["Box Assets"]
)


@router.post(
    path="/initiate-asset-upload",
    response_model=AssetUploadTarget,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_calls=20, window_seconds=60))],
)
async def initiate_asset_upload(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        AssetService,
        Depends(AssetService),
    ],
    data: AssetUploadInitiate,
    response: Response,
) -> AssetUploadTarget:
    # Presigned-цель одноразовая и короткоживущая — запрещаем любое кэширование.
    response.headers["Cache-Control"] = "no-store"
    return await service.initiate_upload(
        user=user,
        data=data,
    )


@router.post(
    path="/complete-asset-upload",
    response_model=BoxAssetRead,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=30, window_seconds=60))],
)
async def complete_asset_upload(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        AssetService,
        Depends(AssetService),
    ],
    data: AssetCompleteRequest,
) -> BoxAssetRead:
    return await service.complete_upload(
        user=user,
        asset_id=data.asset_id,
    )


@router.get(
    path="/get-asset-url",
    response_model=AssetDownloadUrl,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=60, window_seconds=60))],
)
async def get_asset_url(
    asset_id: uuid.UUID,
    service: Annotated[
        AssetService,
        Depends(AssetService),
    ],
    response: Response,
    viewer: Annotated[
        UserVerifySchema | None,
        Depends(get_optional_current_user),
    ] = None,
) -> AssetDownloadUrl:
    response.headers["Cache-Control"] = "no-store"
    return await service.get_download_url(
        viewer=viewer,
        asset_id=asset_id,
    )


@router.get(
    path="/get-box-assets",
    response_model=list[BoxAssetRead],
    status_code=status.HTTP_200_OK,
)
async def get_box_assets(
    instance_id: uuid.UUID,
    service: Annotated[
        AssetService,
        Depends(AssetService),
    ],
    viewer: Annotated[
        UserVerifySchema | None,
        Depends(get_optional_current_user),
    ] = None,
) -> list[BoxAssetRead]:
    return await service.list_box_assets(
        viewer=viewer,
        instance_id=instance_id,
    )


@router.delete(
    path="/delete-asset",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_asset(
    asset_id: uuid.UUID,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user),
    ],
    service: Annotated[
        AssetService,
        Depends(AssetService),
    ],
) -> None:
    return await service.delete_asset(
        user=user,
        asset_id=asset_id,
    )
