import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from starlette import status

from stellage.apps.boxes.templates.schemas import BoxTemplateCreate, BoxTemplateReturn, BoxTemplateReturnWithInstances
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
                .values(**data)
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


    async def get_templates(
        self,
    ) -> list[BoxTemplateReturn]:
        async with self.db.db_session() as session:
            query = (
                select(self.template_model)
            )
            result = await session.execute(query)
            return[
                BoxTemplateReturn.model_validate(template)
                for template in result.scalars()
            ]


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
            template = result.scalar_one_or_none()

            if template:
                return BoxTemplateReturnWithInstances.model_validate(template)

            return None