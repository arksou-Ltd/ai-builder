# Epic 2 Preparation Checklist

## Purpose
为 Epic 2（Identity & Workspace Setup）提供可执行的准备清单，确保规范一致性与依赖链稳定性在启动前得到验证。

## Preparation Tasks

1) 规范一致性清单可执行化（API 路径 / 响应契约 / DTO 基类 / PEP 420）
Owner: Bob（Scrum Master） + Winston（Architect）
验收标准：
- 清单以文档形式发布，并包含“必须/禁止/检查方法”
- 能明确映射到代码与测试位置
- 团队复核通过（至少 PO/Dev/QA 三方认可）

2) 规范一致性检查自动化（最小可用）
Owner: Dana（QA Engineer）
验收标准：
- 本地运行可检测 API 路径与响应契约不一致
- 校验失败可阻止合并或标记为失败
- 覆盖 `/api/health` 与 `/api/v1/auth/me` 的契约一致性

3) 依赖链与 SSH 环境规范化文档
Owner: Charlie（Senior Dev）
验收标准：
- 文档包含 `github-arksou` 的最小 `~/.ssh/config` 配置
- 说明首次拉取 `known_hosts` 处理方式
- 新机器可按文档一次成功完成 `uv sync` 与依赖验证

4) 依赖链校验脚本/流程固化
Owner: Charlie（Senior Dev）
验收标准：
- 明确“依赖链校验命令序列”
- `arksou-kernel-framework` 版本与 Git SSH source 可验证
- 与现有 `test_dependency_chain.py` 的校验逻辑一致

5) Epic 2 认证相关规范与注意事项文档
Owner: Paige（Tech Writer）
验收标准：
- 明确 Clerk 集成边界（登录 vs 仓库授权分离）
- 明确响应契约与路径规范必须遵循
- Epic 2 kickoff 前评审通过

6) Epic 2 “默认正确”脚手架检查
Owner: Amelia（Developer）
验收标准：
- 新 Story 初始化时无需手动纠正规范
- 验证点与清单一致（路径/契约/DTO/PEP420）
- 复核零返工
