import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from starlette import status

from stellage.apps.boxes.templates.managers import TemplateManager
from stellage.apps.boxes.templates.schemas import (
    BoxTemplateCreate,
    BoxTemplatePatch,
    BoxTemplateReturn,
    BoxTemplateReturnWithInstances,
)


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
        creator_id: uuid.UUID,
    ) -> BoxTemplateReturn:
        # creator_id — всегда серверный (текущий пользователь), не из тела.
        return await self.manager.create_template(
            data=data,
            creator_id=creator_id,
        )


    async def update_template(
        self,
        template_id: uuid.UUID,
        creator_id: uuid.UUID,
        data: BoxTemplatePatch,
    ) -> BoxTemplateReturn:
        return await self.manager.update_template(
            template_id=template_id,
            creator_id=creator_id,
            data=data,
        )


    async def delete_template(
        self,
        template_id: uuid.UUID,
        creator_id: uuid.UUID,
    ) -> None:
        return await self.manager.delete_template(
            template_id=template_id,
            creator_id=creator_id,
        )


    async def get_templates(
        self,
    ) -> list[BoxTemplateReturn]:
        return await self.manager.get_templates()


    async def get_template_with_instances(
        self,
        template_id: uuid.UUID
    ) -> BoxTemplateReturnWithInstances:
        template = await self.manager.get_template_with_instances(
            template_id=template_id,
        )

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        # Эндпоинт публичный (без auth): это каталожная витрина шаблона,
        # содержимое чужих экземпляров здесь не отдаём никому и никогда.
        # Контент читается через get-box-instance / get-box-assets, где
        # действует правило видимости.
        for instance in template.instances:
            instance.content = None
            instance.assets = []

        return template