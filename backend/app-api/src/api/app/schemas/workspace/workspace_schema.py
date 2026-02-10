"""工作空间请求与响应 Schema。

定义工作空间创建请求和响应的数据结构。
"""

import re
from datetime import datetime

from arksou.kernel.framework.base import CamelCaseSchema
from pydantic import Field, field_validator

# 允许的字符：字母、数字、中文、普通空格、连字符、下划线、点号
_VALID_NAME_PATTERN = re.compile(
    r"^[A-Za-z0-9_.\- \u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+$",
    re.UNICODE,
)


class WorkspaceCreate(CamelCaseSchema):
    """工作空间创建请求。

    Attributes:
        name: 工作空间名称，strip 后 1-50 字符，不能为纯空白，不能包含非法字符
    """

    name: str = Field(min_length=1, max_length=50, description="工作空间名称")

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        """去除首尾空白后校验非空。"""
        if isinstance(v, str):
            v = v.strip()
        return v

    @field_validator("name", mode="after")
    @classmethod
    def validate_name_chars(cls, v: str) -> str:
        """校验名称不含非法字符。"""
        if not _VALID_NAME_PATTERN.match(v):
            raise ValueError(
                "工作空间名称包含非法字符，仅允许字母、数字、中文、空格、连字符、下划线和点号"
            )
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
