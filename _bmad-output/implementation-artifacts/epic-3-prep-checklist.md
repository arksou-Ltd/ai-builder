# Epic 3 Preparation Checklist

## Purpose
在不提前创建 Epic 3 正式 Story 的前提下，先把 Epic 2 retrospective 的关键发现沉淀为可执行准备项，作为后续 sprint-planning / create-story 的输入基线。

## Scope
- 本清单只定义“准备与约束”，不定义 Epic 3 正式故事编号与开发排期。
- 本清单用于降低 Epic 3 启动后的返工风险，重点覆盖状态一致性、评审前质量门槛、No Mock 合规。

## Unified Workflow Entry Mapping

1) `sprint-status`（统一状态入口）
- Command: `/bmad:bmm:workflows:sprint-status`
- 对应清单项：任务 1、任务 4
- 通过标准：
  - 无状态冲突告警（尤其是 Epic/Story 不一致）
  - 推荐下一动作可被执行，且状态统计可信

2) `sprint-planning`（统一结构刷新入口）
- Command: `/bmad:bmm:workflows:sprint-planning`
- 对应清单项：任务 1、任务 5
- 通过标准：
  - `sprint-status.yaml` 结构完整（epic → stories → retrospective 顺序）
  - retrospective 条目完整存在，状态合法

3) `retrospective`（统一经验回流入口）
- Command: `/bmad:bmm:workflows:retrospective`
- 对应清单项：任务 2、任务 3、任务 5
- 通过标准：
  - 发现项形成可执行 action items
  - 关键发现能回写到准备清单/规范入口

4) `create-story`（仅在准备完成后开放）
- Command: `/bmad:bmm:workflows:create-story`
- 对应清单项：Readiness Gate 全部通过后才允许
- 通过标准：
  - Pre-Review Quality Gate 模板已就位
  - No Mock 合规规则库已就位
  - 状态一致性规则已定义并对齐

## Preparation Tasks

1) 状态一致性自动收敛方案确认（Epic/Story/workflow）
Owner: Bob（Scrum Master） + Winston（Architect）
验收标准：
- 明确状态源优先级与冲突处理规则（例如 Story 全部 done 时 Epic 自动收敛）
- 明确自动收敛触发时机（页面加载、手动刷新、状态变更事件）
- 明确审计日志字段（触发源、前后状态、时间戳、操作者/系统）

2) Pre-Review Quality Gate 检查清单固化
Owner: Dana（QA Engineer） + Charlie（Senior Dev）
验收标准：
- 固化至少 4 类检查：响应契约、参数边界、失败回滚、测试证据
- 定义阻断级别与放行规则（阻断/警告/通过）
- 产出统一 Gate 报告模板（检查项、结论、证据链接）

3) No Mock 合规规则库与检测策略落地
Owner: Dana（QA Engineer）
验收标准：
- 列出项目内禁止项（mock/stub/fake/spy/网络拦截替身等）
- 定义检测命中后的处理动作（阻断、整改、复检）
- 形成“可追溯整改记录”字段规范，便于 retrospective 复盘

4) 步骤面板展示口径对齐（状态+质量门槛+No Mock）
Owner: Alice（Product Owner） + Amelia（Developer）
验收标准：
- 明确面板必须展示的状态与图例（待执行/进行中/已完成/阻断）
- 明确 Quality Gate 与 No Mock 检查结果的展示位置与交互
- 明确用户可执行下一步动作（修复、复检、重新推进）

5) 文档入口统一（避免语义漂移）
Owner: Paige（Tech Writer）
验收标准：
- 形成单一权威文档入口，统一引用状态规则与质量门槛
- `epics.md`、story 文件、review 记录之间引用路径一致
- 变更后可被 sprint-planning / retrospective 直接复用

## Unified Runbook (Before Epic 3 Story Creation)

1. 运行 `/bmad:bmm:workflows:sprint-status`，确认当前状态基线可信。  
2. 若状态结构存在缺失或顺序问题，运行 `/bmad:bmm:workflows:sprint-planning` 刷新。  
3. 使用 retrospective 产物与本清单逐条核对任务 1~5 的证据。  
4. 仅当 Readiness Gate 全部勾选后，才允许进入 `/bmad:bmm:workflows:create-story`。  
5. 任何一项未通过时，回到对应任务 Owner 执行整改并复检。  

## Readiness Gate
- [ ] 上述 5 项均有 Owner 与验收标准
- [ ] 所有准备项均有可复核证据（文档、脚本、报告模板）
- [ ] 团队确认“未通过清单前，不启动 Epic 3 正式故事创建”
- [ ] 已完成一次 Unified Runbook 全流程演练并留存记录

## Notes
- 本清单是 Epic 3 启动前置文档，不替代 `epics.md` 的正式故事定义。
- 当准备项完成后，再进入 BMAD 标准流程创建 Epic 3 Stories。
