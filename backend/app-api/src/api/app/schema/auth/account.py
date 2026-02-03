"""账户信息 Schema。

定义账户相关的请求和响应数据结构。
"""

from pydantic import BaseModel, Field


class AccountResponse(BaseModel):
    """账户信息响应模型。

    用于 /auth/me 端点返回当前用户信息。
    """

    id: str | None = Field(
        default=None,
        description="账户唯一标识符",
    )
    is_authenticated: bool = Field(
        default=False,
        description="是否已认证",
    )
    display_name: str | None = Field(
        default=None,
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
                    "is_authenticated": True,
                    "display_name": "张三",
                    "email": "zhangsan@example.com",
                },
                {
                    "id": None,
                    "is_authenticated": False,
                    "display_name": None,
                    "email": None,
                },
            ]
        }
    }
