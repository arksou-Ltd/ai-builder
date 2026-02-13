"""账户信息 Schema。

定义账户相关的响应数据结构。
"""

from arksou.kernel.framework.schemas import BaseSchema
from pydantic import Field


class AccountResponse(BaseSchema):
    """账户信息响应模型。

    用于 /auth/me 端点返回当前认证用户信息。
    端点已强制认证，所有字段基于 ClerkAccount 填充。
    """

    id: str = Field(
        description="账户唯一标识符（Clerk Account ID）",
    )
    display_name: str = Field(
        description="显示名称",
    )
    email: str | None = Field(
        default=None,
        description="电子邮箱地址",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "user_2abc123def456",
                    "display_name": "张三",
                    "email": "zhangsan@example.com",
                },
            ]
        }
    }
