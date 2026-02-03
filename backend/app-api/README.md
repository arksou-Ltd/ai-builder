# app-api

AI Builder FastAPI 应用服务。

## 概述

此模块为 AI Builder 的后端 API 服务，基于 FastAPI 构建，采用异步优先设计。

## 目录结构

- `core/` - 核心配置（config, database, exceptions）
- `deps/` - FastAPI 依赖注入
- `router/` - API 路由层（按模块分组）
- `service/` - 业务逻辑层
- `schema/` - 请求/响应 Schema

## 启动服务

```bash
# 开发环境
uvicorn api.app.main:app --reload --host 0.0.0.0 --port 8000

# 或使用入口脚本
app-api
```

## 健康检查

```bash
curl http://localhost:8000/health
```

## 依赖

- `common-kernel` - 公共基础库
- `fastapi` - Web 框架
- `sqlalchemy[asyncio]` - 异步 ORM
- `asyncpg` - PostgreSQL 异步驱动
