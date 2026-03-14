import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import select, func, insert, update, delete
from sqlalchemy.exc import IntegrityError
from starlette import status

from stellage.apps.boxes.instances.schemas import BoxInstanceReturn, BoxInstanceCreate
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import BoxInstance


class BoxInstanceRepository:
    def __init__(
        self,
        db: Annotated[
            DBDependency,
            Depends(DBDependency)
        ]
    ) -> None:
        self.db = db
        self.instance_model = BoxInstance


    async def create_instance(
        self,
        user_id: uuid.UUID,
        data: BoxInstanceCreate,
    ) -> BoxInstanceReturn:
        async with self.db.db_session() as session:
            serial_subquery = (
                select(
                    func.coalesce(
                        func.max(
                            self.instance_model.serial_number
                        ),
                        0
                    ) + 1
                )
                .where(
                    self.instance_model.template_id == data.template_id
                )
                .scalar_subquery()
            )

            instance_data = data.model_dump()
            instance_data["serial_number"] = serial_subquery
            instance_data["user_id"] = user_id

            create_query = (
                insert(self.instance_model)
                .values(**instance_data)
                .returning(self.instance_model)
            )

            try:
                result = await session.execute(create_query)
                instance = result.scalar_one()
                await session.commit()
                return BoxInstanceReturn.model_validate(instance)

            except IntegrityError:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Box already exist"
                )

            except Exception as e:
                await session.rollback()
                raise e


    async def move_to_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceReturn:
        async with self.db.db_session() as session:
            query = (
                update(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .values(
                    shelf_id=shelf_id,
                )
                .returning(self.instance_model)
            )

            try:
                result = await session.execute(query)

                box = result.scalar_one_or_none()

                if not box:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Box not found or access denied"
                    )

                await session.commit()

                return BoxInstanceReturn.model_validate(box)

            except IntegrityError:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Box on that shelf already exist"
                )

            except Exception as e:
                await session.rollback()
                raise e



    async def get_box_instances(
        self,
        user_id: uuid.UUID
    ) -> list[BoxInstanceReturn]:
        async with self.db.db_session() as session:
            query = (
                select(self.instance_model)
                .where(self.instance_model.user_id == user_id)
            )

            result = await session.execute(query)

            return[
                BoxInstanceReturn.model_validate(box)
                for box in result.scalars()
            ]


    async def get_box_instance_by_id(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID
    ) -> BoxInstanceReturn | None:
        async with self.db.db_session() as session:
            query = (
                select(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
            )

            result = await session.execute(query)

            box = result.scalar_one_or_none()

            if box:
                return BoxInstanceReturn.model_validate(box)

            return None


    async def delete_box_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        async with self.db.db_session() as session:
            query = (
                delete(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
            )

            try:
                await session.execute(query)
                await session.commit()

            except Exception as e:
                await session.rollback()
                raise e
