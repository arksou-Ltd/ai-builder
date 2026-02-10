"""工作空间 API 端点。

提供工作空间创建和列表查询功能。
"""

from arksou.kernel.framework.base import Result
from fastapi import APIRouter

from api.app.deps.auth import CurrentClerkAccount
from api.app.deps.database import DbSession
from api.app.schemas.workspace.workspace_schema import WorkspaceCreate, WorkspaceResponse
from api.app.services.workspace.workspace_service import WorkspaceService

router = APIRouter()


@router.post(
    "",
    summary="创建工作空间",
    description="为当前用户创建一个新的工作空间。同一用户下工作空间名称不可重复。",
)
async def create_workspace(
    payload: WorkspaceCreate,
    account: CurrentClerkAccount,
    db: DbSession,
) -> Result[WorkspaceResponse]:
    """创建工作空间。

    Args:
        payload: 工作空间创建请求
        account: 当前认证用户（自动注入）
        db: 数据库会话（自动注入）

    Returns:
        Result[WorkspaceResponse]: 新创建的工作空间
    """
    service = WorkspaceService(db)
    workspace = await service.create_workspace(account.clerk_account_id, payload)
    return Result.success(data=workspace)


@router.get(
    "",
    summary="获取工作空间列表",
    description="返回当前用户的所有工作空间，按创建时间倒序排列。",
)
async def list_workspaces(
    account: CurrentClerkAccount,
    db: DbSession,
) -> Result[list[WorkspaceResponse]]:
    """获取当前用户的工作空间列表。

    Args:
        account: 当前认证用户（自动注入）
        db: 数据库会话（自动注入）

    Returns:
        Result[list[WorkspaceResponse]]: 工作空间列表
    """
    service = WorkspaceService(db)
    workspaces = await service.list_workspaces(account.clerk_account_id)
    return Result.success(data=workspaces)
