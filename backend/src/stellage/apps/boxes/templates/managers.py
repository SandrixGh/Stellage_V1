import uuid
from typing import Annotated

from fastapi import Depends

from stellage.apps.boxes.templates.repositories import BoxTemplateRepository
from stellage.apps.boxes.templates.schemas import (
    BoxTemplateCreate,
    BoxTemplatePatch,
    BoxTemplateReturn,
    BoxTemplateReturnWithInstances,
)


class TemplateManager:
    def __init__(
        self,
        repository: Annotated[
            BoxTemplateRepository,
            Depends(BoxTemplateRepository),
        ]
    ) -> None:
        self.repository = repository


    async def create_template(
        self,
        data: BoxTemplateCreate,
        creator_id: uuid.UUID,
    ) -> BoxTemplateReturn:
        return await self.repository.create_template(
            data=data,
            creator_id=creator_id,
        )


    async def update_template(
        self,
        template_id: uuid.UUID,
        creator_id: uuid.UUID,
        data: BoxTemplatePatch,
    ) -> BoxTemplateReturn:
        return await self.repository.update_template(
            template_id=template_id,
            creator_id=creator_id,
            data=data,
        )


    async def delete_template(
        self,
        template_id: uuid.UUID,
        creator_id: uuid.UUID,
    ) -> None:
        return await self.repository.delete_template(
            template_id=template_id,
            creator_id=creator_id,
        )


    async def get_templates(
        self,
        viewer_id: uuid.UUID | None = None,
    ) -> list[BoxTemplateReturn]:
        return await self.repository.get_templates(viewer_id=viewer_id)


    async def get_template_with_instances(
        self,
        template_id: uuid.UUID,
    ) -> BoxTemplateReturnWithInstances | None:
        return await self.repository.get_template_with_instances(
            template_id=template_id,
        )