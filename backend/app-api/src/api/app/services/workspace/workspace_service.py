"""工作空间业务服务。

封装工作空间创建、查询、删除的核心业务逻辑。
所有方法使用内部 account_id（int）而非 Clerk 外部 ID。
"""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from arksou.kernel.framework.base import ConflictException, InternalServerException, NotFoundException
from kernel.common.models.workspace import Workspace

from api.app.schemas.workspace.workspace_schema import WorkspaceCreate, WorkspaceResponse

logger = structlog.get_logger(__name__)


class WorkspaceService:
    """工作空间服务类。

    处理工作空间的创建、查询和删除，强制 account_id 维度数据隔离。
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_workspace(
        self, account_id: int, payload: WorkspaceCreate
    ) -> WorkspaceResponse:
        """创建工作空间。

        Args:
            account_id: 内部账号 ID（auth_accounts.id）
            payload: 创建请求数据

        Returns:
            WorkspaceResponse: 新创建的工作空间

        Raises:
            ConflictException: 同一用户下工作空间名称重复
        """
        workspace = Workspace(
            name=payload.name,
            account_id=account_id,
        )
        self._db.add(workspace)

        try:
            await self._db.flush()
        except IntegrityError as exc:
            await self._db.rollback()
            error_text = str(exc.orig).lower() if exc.orig is not None else str(exc).lower()
            if "uq_workspace_account_name_active" not in error_text:
                logger.exception(
                    "workspace_create_integrity_error",
                    account_id=account_id,
                    name=payload.name,
                )
                raise InternalServerException("工作空间创建失败，请稍后重试") from exc
            logger.warning(
                "workspace_name_conflict",
                account_id=account_id,
                name=payload.name,
            )
            raise ConflictException("工作空间名称已存在")

        await self._db.refresh(workspace)

        logger.info(
            "workspace_created",
            workspace_id=workspace.id,
            account_id=account_id,
        )

        return WorkspaceResponse.model_validate(workspace)

    async def list_workspaces(self, account_id: int) -> list[WorkspaceResponse]:
        """获取当前用户的工作空间列表。

        SoftDeleteMixin 自动过滤 deleted=true 记录，无需手写条件。

        Args:
            account_id: 内部账号 ID（auth_accounts.id）

        Returns:
            list[WorkspaceResponse]: 工作空间列表（按创建时间倒序）
        """
        stmt = (
            select(Workspace)
            .where(Workspace.account_id == account_id)
            .order_by(Workspace.created_at.desc())
        )
        result = await self._db.execute(stmt)
        workspaces = result.scalars().all()

        return [WorkspaceResponse.model_validate(ws) for ws in workspaces]

    async def get_workspace(self, workspace_id: int, account_id: int) -> WorkspaceResponse:
        """获取单个工作空间详情。

        Args:
            workspace_id: 工作空间 ID（雪花 ID）
            account_id: 内部账号 ID（auth_accounts.id），用于所有权验证

        Returns:
            WorkspaceResponse: 工作空间详情

        Raises:
            NotFoundException: 工作空间不存在或不属于当前用户
        """
        stmt = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.account_id == account_id,
        )
        result = await self._db.execute(stmt)
        workspace = result.scalar_one_or_none()

        if workspace is None:
            raise NotFoundException("工作空间不存在")

        return WorkspaceResponse.model_validate(workspace)

    async def delete_workspace(self, workspace_id: int, account_id: int) -> None:
        """软删除工作空间。

        按 workspace_id + account_id 查询（SoftDeleteMixin 自动过滤已删除记录），
        命中则设置 deleted=True，未命中抛 NotFoundException（不泄露资源存在性）。

        Args:
            workspace_id: 工作空间 ID（雪花 ID）
            account_id: 内部账号 ID（auth_accounts.id），用于所有权验证

        Raises:
            NotFoundException: 工作空间不存在或不属于当前用户
        """
        stmt = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.account_id == account_id,
        )
        result = await self._db.execute(stmt)
        workspace = result.scalar_one_or_none()

        if workspace is None:
            raise NotFoundException("工作空间不存在")

        workspace.deleted = True
        await self._db.flush()

        logger.info(
            "workspace_deleted",
            workspace_id=workspace_id,
            account_id=account_id,
        )
