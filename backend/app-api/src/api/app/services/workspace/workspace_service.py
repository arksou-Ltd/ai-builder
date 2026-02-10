"""工作空间业务服务。

封装工作空间创建、查询的核心业务逻辑。
"""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from arksou.kernel.framework.base import ConflictException
from kernel.common.models.workspace import Workspace

from api.app.schemas.workspace.workspace_schema import WorkspaceCreate, WorkspaceResponse

logger = structlog.get_logger(__name__)


class WorkspaceService:
    """工作空间服务类。

    处理工作空间的创建和查询，强制 owner_clerk_id 维度数据隔离。
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_workspace(
        self, owner_clerk_id: str, payload: WorkspaceCreate
    ) -> WorkspaceResponse:
        """创建工作空间。

        Args:
            owner_clerk_id: 当前用户的 Clerk ID
            payload: 创建请求数据

        Returns:
            WorkspaceResponse: 新创建的工作空间

        Raises:
            ConflictException: 同一用户下工作空间名称重复
        """
        workspace = Workspace(
            name=payload.name,
            owner_clerk_id=owner_clerk_id,
        )
        self._db.add(workspace)

        try:
            await self._db.flush()
        except IntegrityError:
            await self._db.rollback()
            logger.warning(
                "workspace_name_conflict",
                owner_clerk_id=owner_clerk_id,
                name=payload.name,
            )
            raise ConflictException("工作空间名称已存在")

        # 刷新获取数据库生成的字段（created_at 等）
        # 事务由框架 get_async_session 自动提交
        await self._db.refresh(workspace)

        logger.info(
            "workspace_created",
            workspace_id=workspace.id,
            owner_clerk_id=owner_clerk_id,
        )

        return WorkspaceResponse.model_validate(workspace)

    async def list_workspaces(self, owner_clerk_id: str) -> list[WorkspaceResponse]:
        """获取当前用户的工作空间列表。

        Args:
            owner_clerk_id: 当前用户的 Clerk ID

        Returns:
            list[WorkspaceResponse]: 工作空间列表（按创建时间倒序）
        """
        stmt = (
            select(Workspace)
            .where(Workspace.owner_clerk_id == owner_clerk_id)
            .order_by(Workspace.created_at.desc())
        )
        result = await self._db.execute(stmt)
        workspaces = result.scalars().all()

        return [WorkspaceResponse.model_validate(ws) for ws in workspaces]
