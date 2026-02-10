"""工作空间请求与响应 Schema。

定义工作空间创建请求和响应的数据结构。
"""

from datetime import datetime

from arksou.kernel.framework.base import CamelCaseSchema
from pydantic import Field, field_validator


class WorkspaceCreate(CamelCaseSchema):
    """工作空间创建请求。

    Attributes:
        name: 工作空间名称，strip 后 1-50 字符，不能为纯空白
    """

    name: str = Field(min_length=1, max_length=50, description="工作空间名称")

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        """去除首尾空白后校验非空。"""
        if isinstance(v, str):
            v = v.strip()
        return v


class WorkspaceResponse(CamelCaseSchema):
    """工作空间响应模型。

    Attributes:
        id: 工作空间 ID（雪花 ID）
        name: 工作空间名称
        created_at: 创建时间
        updated_at: 更新时间
    """

    id: int = Field(description="工作空间 ID")
    name: str = Field(description="工作空间名称")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")
