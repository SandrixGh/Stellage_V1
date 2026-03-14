import uuid
from typing import Annotated

from fastapi import Depends

from stellage.apps.boxes.templates.repositories import BoxTemplateRepository
from stellage.apps.boxes.templates.schemas import BoxTemplateCreate, BoxTemplateReturn


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
    ) -> BoxTemplateReturn:
        return await self.repository.create_template(
            data=data,
        )


    async def get_templates(
        self
    ) -> list[BoxTemplateReturn]:
        return await self.repository.get_templates()


    async def get_template_with_instances(
        self,
        template_id: uuid.UUID,
    ) -> BoxTemplateReturn | None:
        return await self.repository.get_template_with_instances(
            template_id=template_id,
        )