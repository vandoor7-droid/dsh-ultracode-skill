# dsh ultracode——动态工作流编写纪律 skill（dsh 适配版）

把 Claude Code **ultracode 模式（dynamic workflows）** 的使用体验带到 DeepSeek Harness（dsh）：一份装在用户层的 skill，承载触发语义、脚本契约、编排质量模式与呈现纪律，配合 dsh 官方 `workflow` 工具与 `dsh-ultracode` 档位插件使用。

## 这是什么 / 不是什么

**是**：纯提示词纪律层（skill）。编排能力 = dsh 官方 `workflow` 工具（0.2.0-rc.2 内置 `packages/workflow`，含 PTC 沙箱、`ui-workflow-run` 进度节点）+ 可选的 `@dessera/dsh-ultracode` 档位开关；本 skill 补上 Claude Code ultracode 体验里官方与插件都没有的**编写纪律**（质量模式、pipeline 纪律、触发语义、呈现纪律）。

**不是**：不是运行时、不注入新钩子、不改官方工具行为。Claude Code 有而 dsh 没有的能力（budget、`workflow()` 嵌套、resume、saved workflow）在 skill 里**如实标注**并给替代路径，不硬造——见 [docs/seam-gap.md](docs/seam-gap.md)。

## 仓库结构

```
skills/ultracode/
├── SKILL.md                      # 主体：触发语义、编写流程、评审启发式、呈现纪律、诚实清单
└── references/
    ├── dsh-contract.md           # dsh 脚本硬契约（meta=工具参数、钩子语义、上限、检查表）
    ├── patterns.md               # 编排模式语言（结构/信任/多样性/规模/分工/组合）
    └── archetypes.md             # 任务原型地图、模式嫁接、多阶段串联模板
docs/
├── seam-gap.md                   # dsh 缺失接缝记录 + 二期候选
├── acceptance.md                 # 验收实测报告（含截图）
evals/                            # skill-creator 评测用例与断言
README.md
THIRD_PARTY_NOTICES.md            # MIT 素材署名（hesreallyhim / scasella / PabloNAX）
```

## 安装（用户层级，全局会话可用）

```powershell
Copy-Item -Recurse .\skills\ultracode "$env:USERPROFILE\.dsh\skills\ultracode"
```

新开会话即可在技能目录中看到 `ultracode`。卸载 = 删除该目录。

前置（推荐）：`@dessera/dsh-ultracode` 档位插件（composer 三档开关 + 每回合授权注入）；dsh 官方 `workflow` 工具为发行版自带，无需安装。

## 使用

- 开档位：会话里 `/ultracode` 切换 off/high/ultra。
- 原话触发：直接说 `ultracode: <任务>`、"用 workflow 跑…"、"fan out agents"、"多 agent 编排"。
- 手动调技能：点名 `ultracode` 技能，或让模型读 `skills/ultracode/SKILL.md`。

## 调研与选型结论（为什么是"改写"而不是直接用现成的）

| 候选 | 结论 | 原因 |
|---|---|---|
| dsh 官方 `packages/workflow` | **直接采用（内置）** | 运行时/工具/进度 UI 已一比一同构复刻 Claude Code dynamic workflows |
| [Dessera/dsh-ultracode](https://github.com/Dessera/dsh-ultracode) | **直接采用（已装）** | off/high/ultra 档位开关；提示词借鉴自 pi 版，故纪律层另补 |
| [PabloNAX/ultracode-skill](https://github.com/PabloNAX/ultracode-skill) | 不采用，取素材 | 包件工件流，不教编排脚本、无质量模式、代理上限 5 个与 ultracode 相反 |
| [hesreallyhim/ultracode-workflows](https://github.com/hesreallyhim/ultracode-workflows) | **改写底本** | 模式语言质量最高；但 `export const meta`/budget/resume 绑定 Claude Code，照搬会写坏 dsh 脚本 |
| [scasella/claude-dynamic-workflows-codex](https://github.com/scasella/claude-dynamic-workflows-codex) | 参考素材 | archetype/pattern 表丰富；绑定其自研 runner CLI |
| [omdsh-dev/dsh_workflow](https://github.com/omdsh-dev/dsh_workflow) | 不采用 | 偏"可保存/可恢复"重产品层；兼容性存疑（仅测 0.0.1-rc.2） |

完整规格依据：Claude Code 官方提示词提取（Piebald-AI/claude-code-system-prompts，ccVersion 2.1.248/2.1.265）与 `reference/report-ux-spec.zh.md`。

## 评测

见 [evals/evals.json](evals/evals.json)：4 条用例 ×（有/无 skill）对照，断言涵盖 `export const meta` 禁令、meta/phases 完整性、pipeline 优先、质量模式、触发准确性；15/15 断言两侧全过——基线受官方 workflow 工具描述（注入所有 agent 上下文）污染，二元契约断言无区分度，定性差异以分析员判读记录（with_skill：八步流程、屏障辩护 11 处、评审启发式分类 vs 基线平铺）。

**触发优化**（20 条 should/shouldn't-query 盲判，judger 只见查询与目录）：R1 敏感度 9/11、误触 0/9 → description 补"全景理解/架构梳理/根因诊断"触发词 → **R2 敏感度 11/11（100%）、误触 0/9（0%）**。

结果与逐轮改进记录在 `ultracode-workspace/`（本地评测产物，不入库）。
