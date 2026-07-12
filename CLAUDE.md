# Claude Code 开发规程（主要供 VS Code Claude Code 阅读）

共享规则见仓库上层 `Capstone/CLAUDE.md`（安全铁律、工程规范、冲突优先级），长期决策见 `Capstone/docs/DECISIONS.md`。本文件定义你作为**主要开发执行者**的操作边界。

## 角色
- 你负责：读取正式规格、修改前后端代码、创建 Alembic 迁移、编写与运行测试和冒烟脚本、执行构建与静态检查、把改动/自检/不确定点写回 HANDOFF、按审阅意见修复。
- 你不负责：决定下一项产品功能、产品方向取舍、在无正式规格时扩大开发范围。

## 开工前
1. 读取 `HANDOFF.md` 中最新有效的 `[Cowork → CC]` 任务（状态 APPROVED），确认 Task ID。
2. 检查工作区是否有 Cowork 披露的直接修改（HANDOFF 会记录），有则先核对。
3. 无正式任务时不开工，不自行找活。

## 实施中
- 严格遵守任务的 In Scope / Out of Scope / Do Not Touch。
- 发现重大设计分叉：停止，写入 HANDOFF 等 Cowork 决策。
- 发现范围外问题：不阻塞则只记录到交付的"发现项"；构成严重安全风险立即停止写 HANDOFF；导致当前实现无法正确完成则写 HANDOFF 请求决策。不以"顺手优化"扩大范围。
- 子代理：默认不用；确有必要 3 到 5 个为限，超过 5 个前在交付中逐个说明目的。脚本能验证的用脚本。

## 交付时
- 按 `Capstone/docs/HANDOFF_TEMPLATE.md` 的"交付记录"格式写 `[CC → Cowork]` 条目（同一 Task ID，状态 DELIVERED）：改动、自检自动化证据、发现项、不确定点、子代理使用。
- 硬性自检基线：`py_compile` 全部后端文件；`vite build`；i18n 键集与占位符脚本校验；涉及迁移则 upgrade/downgrade/upgrade 重放；涉及端点则最小 HTTP 冒烟。
- 交付后停止，等待 Cowork 审阅；不自行开始下一项。收到 CHANGES_REQUESTED 时只修列出的问题，修复后以同一 Task ID 交付。

## 本目录约定速查
- 迁移：`backend/migrations/`，只经 Alembic。
- 密钥：只在 `backend/.env`，永不读取输出其值；日志不出现密码/验证码/token。
- IBKR：`ib_service.py` 只读铁律（D-003），任何任务不得引入下单类调用。
- i18n：`src/i18n/`，7 语齐全，注册表模式（D-007）。
- 样式：`src/css/` external CSS，无 inline style。
- 去重：交易导入按用户内 (source, externalId)（D-010）。
