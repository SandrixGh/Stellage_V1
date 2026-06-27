import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import select, func, insert, update, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from starlette import status

from stellage.apps.boxes.instances.schemas import BoxInstanceReturn, BoxInstanceCreate, BoxInstanceWithTemplate
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import BoxInstance, Shelf


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
    ) -> BoxInstanceWithTemplate:
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
                .returning(self.instance_model.id)
            )

            try:
                result = await session.execute(create_query)
                new_instance_id = result.scalar_one()

                select_query = (
                    select(self.instance_model)
                    .where(self.instance_model.id == new_instance_id)
                    .options(joinedload(self.instance_model.template))
                )

                final_result = await session.execute(select_query)

                instance = final_result.unique().scalar_one()

                await session.commit()
                return BoxInstanceWithTemplate.model_validate(instance)

            except IntegrityError:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Box already exist"
                )


    async def move_to_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceWithTemplate:
        async with self.db.db_session() as session:
            if shelf_id is not None:
                shelf_owner_query = (
                    select(Shelf.id)
                    .where(
                        Shelf.id == shelf_id,
                        Shelf.user_id == user_id,
                    )
                )
                owned_shelf = await session.execute(shelf_owner_query)
                if owned_shelf.scalar_one_or_none() is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Shelf not found or access denied"
                    )

            update_query = (
                update(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .values(
                    shelf_id=shelf_id,
                )
            )

            select_query = (
                select(self.instance_model)
                .where(self.instance_model.id == instance_id)
                .options(joinedload(self.instance_model.template))
            )

            try:
                await session.execute(update_query)

                result = await session.execute(select_query)

                box = result.unique().scalar_one_or_none()

                if not box:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Box not found or access denied"
                    )

                await session.commit()

                return BoxInstanceWithTemplate.model_validate(box)

            except IntegrityError:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Box on that shelf already exist"
                )



    async def get_box_instances(
        self,
        user_id: uuid.UUID
    ) -> list[BoxInstanceWithTemplate]:
        async with self.db.db_session() as session:
            query = (
                select(self.instance_model)
                .where(self.instance_model.user_id == user_id)
                .options(joinedload(self.instance_model.template))
            )

            result = await session.execute(query)

            return[
                BoxInstanceWithTemplate.model_validate(box)
                for box in result.unique().scalars()
            ]


    async def get_box_instance_by_id(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID
    ) -> BoxInstanceWithTemplate | None:
        async with self.db.db_session() as session:
            query = (
                select(self.instance_model)
                .where(
                    self.instance_model.user_id == user_id,
                    self.instance_model.id == instance_id,
                )
                .options(joinedload(self.instance_model.template))
            )

            result = await session.execute(query)

            box = result.unique().scalar_one_or_none()

            if box:
                return BoxInstanceWithTemplate.model_validate(box)

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

            await session.execute(query)
            await session.commit()
