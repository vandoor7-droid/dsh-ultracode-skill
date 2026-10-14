# Third-Party Notices

本仓库产出的 skill `ultracode`（`skills/ultracode/`）在改编过程中使用了以下开源材料。三者均为 MIT 协议，改写保留了其结构与语义贡献并在此署名。

## 1. hesreallyhim/ultracode-workflows

- 仓库：https://github.com/hesreallyhim/ultracode-workflows
- 许可：MIT License — Copyright (c) 2026 Really Him
- 取用素材：
  - `plugins/ultracode-workflows/skills/workflow-authoring/SKILL.md` — 编写流程八步、评审启发式、屏障辩护纪律、"抽不变式不借表象"等 → 改编进 `skills/ultracode/SKILL.md`
  - `references/patterns.md` — 编排模式语言（结构/信任/多样性/规模/分工/组合）→ 改编进 `skills/ultracode/references/patterns.md`
  - `references/catalog-patterns.md` — 原型地图、模式嫁接、不相容性、提问清单 → 改编进 `skills/ultracode/references/archetypes.md`
  - `references/api-contract.md` — 约定部分（args/schema/提示词/结构/失败诚实/检查表）→ 按 dsh 重写进 `references/dsh-contract.md`
- 适配说明：删除 Claude Code 运行时绑定内容（`export const meta`、budget 钩子、`workflow()` 嵌套、resume、`.claude/workflows`、agentType/effort/isolation 选项、lint/diagram 脚本），按 dsh 0.2.0-rc.2 的实际能力重写硬契约。

## 2. scasella/claude-dynamic-workflows-codex

- 仓库：https://github.com/scasella/claude-dynamic-workflows-codex
- 许可：MIT License — Copyright (c) 2026 Stephen Casella
- 取用素材：`SKILL.md` 的 archetype/pattern+failure-mode 对照、"何时不用工作流"、anti-overbuild 规则、模式命名词汇 → 概念性吸收进 `references/archetypes.md` 与 `SKILL.md` 评审启发式
- 适配说明：其 runner CLI（`--budget`/`--resume`/journal/fleet）为该仓库自有运行时，未取用。

## 3. PabloNAX/ultracode-skill

- 仓库：https://github.com/PabloNAX/ultracode-skill
- 许可：MIT License — Copyright (c) 2026 Pavel Kaloshin
- 取用素材：集成纪律（父会话拥有集成、拒绝无证据输出）、"Never paste raw agent logs"、审批门清单、子 agent 提示词模板中"You are not alone in the codebase"式守则 → 概念性吸收进 `SKILL.md` 呈现纪律与 `references/dsh-contract.md` 提示词约定
- 适配说明：其包件文件工件流程（plan.md/packets/state.json）与代理数量上限（5）不符合 ultracode 体验目标，未采用。

## 4. 语义参考（未逐字取用）

- Piebald-AI/claude-code-system-prompts（https://github.com/Piebald-AI/claude-code-system-prompts）中提取的 Claude Code 官方提示词（Workflow 工具描述、Ultracode system-reminder、Workflow authoring reference）作为本技能触发语义与质量模式的**语义基准**；正文为独立改写，未逐字搬运 Anthropic 版权文本。
