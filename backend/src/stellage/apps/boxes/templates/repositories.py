import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from starlette import status

from stellage.apps.boxes.templates.schemas import (
    BoxTemplateCreate,
    BoxTemplatePatch,
    BoxTemplateReturn,
    BoxTemplateReturnWithInstances,
)
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import BoxTemplate


class BoxTemplateRepository:
    def __init__(
        self,
        db: Annotated[
            DBDependency,
            Depends(DBDependency)
        ]
    ) -> None:
        self.db = db
        self.template_model = BoxTemplate


    async def create_template(
        self,
        data: BoxTemplateCreate
    ) -> BoxTemplateReturn:
        async with self.db.db_session() as session:
            query = (
                insert(self.template_model)
                .values(**data.model_dump())
                .returning(self.template_model)
            )
            try:
                result = await session.execute(query)
                template = result.scalar_one()
                await session.commit()
                return BoxTemplateReturn.model_validate(template)

            except IntegrityError:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Template already exist"
                )

            except Exception as e:
                await session.rollback()
                raise e


    async def update_template(
        self,
        template_id: uuid.UUID,
        creator_id: uuid.UUID,
        data: BoxTemplatePatch,
    ) -> BoxTemplateReturn:
        """Обновляет поля шаблона. Менять можно только СВОЙ шаблон (creator_id):
        каталожные/чужие шаблоны редактировать нельзя (404 — как будто не найден)."""
        values = data.model_dump(exclude_none=True)

        async with self.db.db_session() as session:
            if values:
                update_query = (
                    update(self.template_model)
                    .where(
                        self.template_model.id == template_id,
                        self.template_model.creator_id == creator_id,
                    )
                    .values(**values)
                )
                await session.execute(update_query)

            select_query = (
                select(self.template_model)
                .where(
                    self.template_model.id == template_id,
                    self.template_model.creator_id == creator_id,
                )
            )
            result = await session.execute(select_query)
            template = result.scalar_one_or_none()

            if not template:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Template not found or access denied",
                )

            await session.commit()
            return BoxTemplateReturn.model_validate(template)


    async def get_templates(
        self,
    ) -> list[BoxTemplateReturn]:
        async with self.db.db_session() as session:
            query = (
                select(self.template_model)
                .options(joinedload(self.template_model.creator))
            )
            result = await session.execute(query)
            templates = []
            for template in result.unique().scalars():
                data = BoxTemplateReturn.model_validate(template)
                # Автор коробки: предпочитаем username, иначе local-part email
                # (полный email — PII — наружу не отдаём). None = коробка платформы.
                if template.creator:
                    data.owner_username = (
                        template.creator.username
                        or template.creator.email.split("@")[0]
                    )
                templates.append(data)
            return templates


    async def get_template_with_instances(
        self,
        template_id: uuid.UUID
    ) -> BoxTemplateReturnWithInstances | None:
        async with self.db.db_session() as session:
            query = (
                select(
                    self.template_model
                )
                .options(joinedload(self.template_model.instances))
                .where(self.template_model.id == template_id)
            )

            result = await session.execute(query)
            template = result.unique().scalar_one_or_none()

            if template:
                return BoxTemplateReturnWithInstances.model_validate(template)

            return None