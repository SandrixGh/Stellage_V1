import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from starlette import status

from stellage.apps.boxes.templates.managers import TemplateManager
from stellage.apps.boxes.templates.schemas import BoxTemplateReturn, BoxTemplateCreate


class TemplateService:
    def __init__(
        self,
        manager: Annotated[
            TemplateManager,
            Depends(TemplateManager)
        ]
    ):
        self.manager = manager


    async def create_template(
        self,
        data: BoxTemplateCreate,
    ) -> BoxTemplateReturn:
        return await self.manager.create_template(
            data=data,
        )


    async def get_templates(
        self,
    ) -> list[BoxTemplateReturn]:
        return await self.manager.get_templates()

    async def get_template_with_instances(
        self,
        template_id: uuid.UUID
    ) -> BoxTemplateReturn:
        template = await self.manager.get_template_with_instances(
            template_id=template_id,
        )

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        return template