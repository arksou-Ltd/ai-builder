# AI Builder

AI 驱动的软件开发工作流平台。PM 通过自然语言描述需求，系统自动完成 Epic 拆分、Story 生成、代码开发、Code Review 与 PR 提交的全流程。

## 项目结构

```
ai-builder/
├── backend/                    # Python 后端 (uv workspace)
│   ├── pyproject.toml          # 工作区根配置
│   ├── .python-version         # Python 版本锁定 (3.12)
│   ├── common-kernel/          # 公共基础库
│   └── app-api/                # FastAPI 应用服务
├── frontend/                   # Next.js 前端
│   └── app-web/                # Web 应用 (App Router)
├── docs/                       # 项目文档
└── _bmad-output/               # BMAD 工作流规划产出
```

## 后端架构

### app-api — FastAPI 应用服务

后端 API 服务，基于 FastAPI 构建，异步优先设计。

```
app-api/src/api/app/
├── main.py          # FastAPI 入口 + 应用工厂
├── core/            # 核心配置（config, database, exceptions）
├── deps/            # FastAPI 依赖注入（auth, database）
├── routers/         # API 路由层（按模块分组）
├── services/        # 业务逻辑层
└── schemas/         # 请求/响应 Schema
```

### common-kernel — 公共基础库

承载 `arksou-kernel-framework` 透传与项目公共定义：

- **公共枚举**：`kernel.common.enums`
- **公共模型**：`kernel.common.models`

```python
from kernel.common.enums import ProjectStatus
from kernel.common.models import Account
```

### 依赖关系

```
app-api → common-kernel → arksou-kernel-framework[all]
```

框架版本由 `common-kernel/pyproject.toml` 的 `[tool.uv.sources]` tag 管理，升级时只需修改该处。

## 开发指南

### 环境准备

```bash
# 确保 Python 3.12+ 已安装
python --version

# 安装 uv（包管理器）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 安装后端依赖
cd backend
uv sync
```

### 启动服务

```bash
# 后端开发服务器
cd backend
uv run --package app-api uvicorn api.app.main:app --reload --host 0.0.0.0 --port 8000

# 前端开发服务器
cd frontend/app-web
npm install
npm run dev
```

### 运行测试

```bash
# 后端测试
cd backend
uv run --package app-api --extra dev pytest app-api/tests/ -v
```

### 健康检查

```bash
curl http://localhost:8000/api/health
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui |
| 后端 | Python 3.12+ + FastAPI + SQLAlchemy 2.0 |
| 数据库 | PostgreSQL 16+ |
| 认证 | Clerk（身份认证）+ GitHub OAuth（仓库授权） |
| 基础框架 | arksou-kernel-framework（统一响应、ORM、缓存、日志、可观测性） |
