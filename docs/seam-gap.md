# dsh 缺失接缝记录（seam-gap）

范围：Claude Code ultracode / dynamic workflows 体验中，dsh 0.2.0-rc.2 **没有对应公开接缝**的能力。按 dsh 插件开发规范（§3.3），缺接缝的能力不 hack 绕过、不虚假承诺；skill 中以"诚实清单 + 替代路径"呈现（见 `skills/ultracode/SKILL.md`）。若上游未来提供接缝，可在此追加并更新 skill。

| 能力 | Claude Code 行为 | dsh 0.2.0-rc.2 现状 | 证据 | 当前替代路径 |
|---|---|---|---|---|
| token 预算钩子 `budget.{total,spent,remaining}` | 脚本内按预算守卫循环、缩放 fleet，超限 `agent()` 抛错 | 无。引擎明言 "No token-budget vocabulary" | `packages/workflow/workflow/README.md` L130 | 轮次/fleet/条目上限；预算要求换算成上限 + `log()` 汇报 |
| `workflow()` 脚本内嵌套组合 | 一层嵌套的 conductor 模式 | 无。"No saved or nested workflows" | `packages/workflow/workflow/README.md` L129 | 会话层串联（每段一个工作流） |
| 具名/saved workflow 注册表与 `/workflows` 列表、`s` 存为命令 | 保存、按名调用、列表页 | 无 | 同上 | 不做；脚本随调用内联提交 |
| `scriptPath` + `resumeFromRunId` 续跑 + journal 缓存 | 最长不变前缀缓存重放 | 无 | 同上 | 中间结果落文件，经 `args` 传入重跑 |
| `agent()` 的 `effort`/`isolation:'worktree'`/`agentType`/`stallMs` | 逐调用覆盖 | 无；未知选项 fatal 拒绝 | `tool-workflow/src/index.ts` DESCRIPTION（"Anything else… is rejected loudly"） | 分片不相交替代隔离；提示词特化替代 agentType；`provider`/`model` 覆盖慎用 |
| 用量上限暂停（autoContinueAtUsageLimit）/停滞自动重启 | 有 | 无 | 官方文档 workflow.zh.md 无对应事件 | 停止即任务结算；重要产物落文件重跑 |
| 执行前权限对话框（phases 预览 / View raw script） | 有 | 无专门对话框；走通用工具审批链路（如启用） | `ui-workflow-run` README："控制操作不属于本界面" | 验收阶段记录；如需 → 二期薄插件 |
| `/workflows` 钻取 agent 详情（prompt/工具调用/token 用量） | 有 | `workflow-run` 节点只显示 run/阶段/成员身份与状态 | `packages/client/ui-workflow-run/README.zh.md` L90 | 二期薄插件候选（`tool.call.toolview` keyed `workflow` / 扩展节点） |
| ultracode 关键词 system-reminder（仅人类输入、Alt+W 忽略） | 有 | dsh-ultracode 插件以每回合 user 消息注入替代（非官方） | `Dessera/dsh-ultracode` architecture | 已由插件覆盖；其 UI 露出风险在验收阶段实测 |

## 二期候选（本方案不实施）

1. **注入展示替换 + workflow 工具卡片**：自定义 `tool.call.toolview`（keyed `workflow`）避免任何脚本/提示词刷屏；或以更隐蔽的机制替代 user 消息注入（需 dsh 官方接缝支持隐藏注入，暂无 → 记录于此）。
2. **进度钻取增强**：基于 `workflow/*` 事件（只读 emit）扩展客户端展示，不改执行所有权。
