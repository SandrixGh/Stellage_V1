import logging
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from starlette import status

logger = logging.getLogger(__name__)

from stellage.apps.profile.avatar import AvatarManager

from stellage.apps.boxes.templates.schemas import (
    BoxTemplateCreate,
    BoxTemplatePatch,
    BoxTemplateReturn,
    BoxTemplateReturnWithInstances,
)
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.enums.asset_status import AssetStatusEnum
from stellage.database.models import BoxAsset, BoxInstance, BoxTemplate


class BoxTemplateRepository:
    def __init__(
        self,
        db: Annotated[
            DBDependency,
            Depends(DBDependency)
        ],
        avatar_manager: Annotated[
            AvatarManager,
            Depends(AvatarManager)
        ],
    ) -> None:
        self.db = db
        self.avatar_manager = avatar_manager
        self.template_model = BoxTemplate


    async def create_template(
        self,
        data: BoxTemplateCreate,
        creator_id: uuid.UUID,
    ) -> BoxTemplateReturn:
        async with self.db.db_session() as session:
            # creator_id проставляется сервером, а не из тела запроса — защита
            # от подделки авторства/выдачи шаблона за платформенный.
            query = (
                insert(self.template_model)
                .values(**data.model_dump(), creator_id=creator_id)
                .returning(self.template_model)
            )
            try:
                result = await session.execute(query)
                template = result.scalar_one()
                await session.commit()
                return BoxTemplateReturn.model_validate(template)

            except IntegrityError as err:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Template already exist"
                ) from err

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


    async def delete_template(
        self,
        template_id: uuid.UUID,
        creator_id: uuid.UUID,
    ) -> None:
        """Удаляет свой шаблон (по creator_id). Используется как компенсация,
        когда создание экземпляра под только что созданным шаблоном сорвалось —
        чтобы не оставлять orphan-шаблон в каталоге."""
        async with self.db.db_session() as session:
            await session.execute(
                delete(self.template_model).where(
                    self.template_model.id == template_id,
                    self.template_model.creator_id == creator_id,
                )
            )
            await session.commit()


    async def get_templates(
        self,
    ) -> list[BoxTemplateReturn]:
        from stellage.database.models import BoxComment, BoxLike
        async with self.db.db_session() as session:
            query = (
                select(self.template_model)
                .options(joinedload(self.template_model.creator))
            )
            result = await session.execute(query)
            scalars = list(result.unique().scalars().all())

            # Fetch likes counts and comments counts with fail-safe error protection
            likes_map = {}
            try:
                likes_stmt = (
                    select(BoxLike.template_id, func.count(BoxLike.id))
                    .where(BoxLike.template_id.isnot(None))
                    .group_by(BoxLike.template_id)
                )
                likes_map = dict((await session.execute(likes_stmt)).all())
            except Exception:
                pass

            comments_map = {}
            try:
                comments_stmt = (
                    select(BoxComment.template_id, func.count(BoxComment.id))
                    .where(BoxComment.template_id.isnot(None))
                    .group_by(BoxComment.template_id)
                )
                comments_map = dict((await session.execute(comments_stmt)).all())
            except Exception:
                pass

            templates = []
            try:
                async with self.avatar_manager.s3.get_signing_client() as s3_client:
                    for template in scalars:
                        data = BoxTemplateReturn.model_validate(template)
                        if template.creator:
                            data.owner_username = (
                                template.creator.username
                                or template.creator.email.split("@")[0]
                            )
                            data.owner_nickname = template.creator.nickname
                            if getattr(template.creator, "avatar_key", None):
                                try:
                                    data.owner_avatar_url = await self.avatar_manager.presign_avatar(
                                        s3_client,
                                        template.creator.avatar_key,
                                    )
                                except Exception:
                                    pass
                        data.likes_count = likes_map.get(template.id, 0)
                        data.comments_count = comments_map.get(template.id, 0)
                        templates.append(data)
            except Exception as exc:
                logger.exception("Error in presigning template avatars: %s", exc)
                for template in scalars:
                    data = BoxTemplateReturn.model_validate(template)
                    if template.creator:
                        data.owner_username = (
                            template.creator.username
                            or template.creator.email.split("@")[0]
                        )
                        data.owner_nickname = template.creator.nickname
                    data.likes_count = likes_map.get(template.id, 0)
                    data.comments_count = comments_map.get(template.id, 0)
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
                .options(
                    joinedload(self.template_model.instances)
                    .selectinload(
                        BoxInstance.assets.and_(
                            BoxAsset.status == AssetStatusEnum.READY
                        )
                    )
                )
                .where(self.template_model.id == template_id)
            )

            result = await session.execute(query)
            template = result.unique().scalar_one_or_none()

            if template:
                return BoxTemplateReturnWithInstances.model_validate(template)

            return None