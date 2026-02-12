"""工作空间 API 端点。

提供工作空间创建、列表查询和删除功能。
Router 层显式通过 AccountService 解析内部 account，再调用 WorkspaceService。
"""

from arksou.kernel.framework.base import NotFoundException, Result
from fastapi import APIRouter, Path

from api.app.deps.auth import CurrentClerkAccount
from api.app.deps.database import DbSession
from api.app.schemas.workspace.workspace_schema import WorkspaceCreate, WorkspaceResponse
from api.app.services.account.account_service import AccountService
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
    """创建工作空间。"""
    account_service = AccountService(db)
    internal_account_id = await account_service.resolve_or_create_by_clerk_id(
        account.clerk_account_id, account.email
    )

    service = WorkspaceService(db)
    workspace = await service.create_workspace(internal_account_id, payload)
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
    """获取当前用户的工作空间列表。"""
    account_service = AccountService(db)
    internal_account_id = await account_service.resolve_by_clerk_id(
        account.clerk_account_id
    )
    if internal_account_id is None:
        # 新用户尚未建立内部账号时，列表语义应为"空列表"，避免 GET 产生写副作用
        return Result.success(data=[])

    service = WorkspaceService(db)
    workspaces = await service.list_workspaces(internal_account_id)
    return Result.success(data=workspaces)


@router.delete(
    "/{workspace_id}",
    summary="删除工作空间",
    description="软删除指定工作空间。仅工作空间所有者可执行删除。",
)
async def delete_workspace(
    account: CurrentClerkAccount,
    db: DbSession,
    workspace_id: int = Path(gt=0),
) -> Result[None]:
    """删除工作空间（软删除）。"""
    account_service = AccountService(db)
    internal_account_id = await account_service.resolve_by_clerk_id(
        account.clerk_account_id
    )
    if internal_account_id is None:
        # 当前用户不存在内部账号视为查无资源，不泄露任何存在性信息
        raise NotFoundException("工作空间不存在")

    service = WorkspaceService(db)
    await service.delete_workspace(workspace_id, internal_account_id)
    return Result.success(message="工作空间已删除")
