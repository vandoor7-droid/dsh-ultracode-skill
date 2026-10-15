# 验收实测报告（acceptance）

范围：本方案（skill + 官方 workflow 工具 + dsh-ultracode 插件组合）在真实 dsh 0.2.0-rc.2 桌面部署上的实测证据。逐项对照计划的验收要点；证据含截图（同目录 PNG）与评测产物（`ultracode-workspace/`）。

状态标记：✅ 已验收 · ⏳ 待做 · ⛔ 缺接缝（见 `seam-gap.md`）

## 1. 安装与触发

| 要点 | 结果 | 证据 |
|---|---|---|
| skill 安装到用户层级 | ✅ `~/.dsh/skills/ultracode/`（SKILL.md + references×3，与官方 dsh-dev-reference 目录同构） | 安装命令回显；目录热更新后本会话 `available_skills` 消息即出现 `ultracode` 条目与完整 description |
| description 触发覆盖 | ✅ 触发优化两轮实测：R1 灵敏度 9/11、误报 0/9；R2（description 修订后）**灵敏度 11/11、误报 0/9**（commit `5cda4dc`）。中文触发词（ultracode、多 agent 编排、扇出、并行 subagent、工作流编排…）与英文（fan out agents、orchestrate with subagents…）均覆盖 | `ultracode-workspace/trigger-eval/catalog.json`（含 live 会话快照）；commit `5cda4dc` |
| 与官方 tool-workflow 提示不冲突 | ✅ 措辞："ultracode 开启即构成官方所要求的显式请求；冲突时以官方工具规则为准"（SKILL.md 触发语义节） | 源文 |

## 2. workflow 工具全链路冒烟（评测即冒烟）

| 要点 | 结果 | 证据 |
|---|---|---|
| 一次真实运行多 agent 扇出 | ✅ 8/8 agent 成功；meta/phases/结构化 schema 返回全部生效 | 工具返回 `{total:8, succeeded:8}`；`ultracode-workspace/iteration-1/*/grading.json` |
| 进度节点呈现 | ✅ 树状图显示 **`工作流 ultracode-skill-eval 已完成 · 8/8 成员`** 节点 + 成员节点 | `gui-tree-and-transcript.png`（右栏） |
| 完成行与耗时 | ✅ "已完成，用时 1 小时 14 分 42 秒" | `gui-workflow-done-no-banner-leak.png`（transcript 第三屏） |
| 逐 agent token 统计 | ⛔ dsh 无 budget 词汇表，`timing.json` 不可得 → 用墙钟时长替代记录 | seam-gap.md #1 |

## 3. 视觉验收（核心痛点：大段提示词刷屏）

对照物：pi-dynamic-workflows（原版工作流编排插件）曾在对话流露出大段系统提示词，用户明确点名为不可接受项。

| 要点 | 结果 | 证据 |
|---|---|---|
| ultracode banner 注入不刷屏 | ✅ 连续向上核查 3 屏历史（goal 续行、workflow 完成行、diff 卡、正常消息）**均无** armed/Effort: ULTRA 大段文本块；注入行在 transcript 中折叠或隐藏 | `gui-round2-goal-row.png`、`gui-workflow-done-no-banner-leak.png` |
| workflow 脚本不外露 | ✅ 工具调用渲染为紧凑行（"已调用工具"折叠），无脚本全文倾倒 | `gui-tree-and-transcript.png` |
| 档位控件 | ✅ composer 金色 `Ultracode 极致` 胶囊（三档开关右三态） | 三张截图均可见 |
| diff 卡/消息卡 | ✅ "已编辑 7 个文件"卡片按文件列出 +/- 行数，正常 | `gui-round2-goal-row.png` |
| 队列中的运行提示词可见性 | ⏳ 审批对话框若启用权限确认时的展示（本部署默认未触发审批行） | seam-gap.md #7 |

## 4. 行为验收（A/B off vs ultra）

lab 平面（`~/.dsh-lab`，port 3082）实测，插件 `@dessera/dsh-ultracode@^0.1.5`（与桌面用户级安装同源）。lab 会话 `session-aef9a5ba-b770-4a37-b786-2e62b8ff8f6b`。解码工具 `scripts/decode-dsh-session.mjs`（多帧 zstd magic 扫描，77/77 帧、138 条记录全量解码）。

| 要点 | 结果 | 证据 |
|---|---|---|
| off 档：实质性任务 solo / 普通 subagent，不起 workflow | ✅ OFF 档发实质任务（三角度仓库评审）→ solo 执行（纯工具串行：搜索代码/读取/运行命令），用时 6 分 32 秒，**无 workflow 节点**；解码记录中 `workflows mode armed` 标记 **0 次**（记录中 L27 `user/message` 含任务原文，可对照确认是同一轮） | 截图 `lab-off-solo-no-workflow.png`；解码：`--match "workflows mode armed"` → 0 matches |
| ultra 档：实质性任务自动编排，琐碎任务 solo | ✅ ULTRA 档同会话发实质任务（架构/文档/性能三角度）→ **自动编排 workflow**：`dsh-ultracode-repo-review` 多阶段对抗式复查（3 find + 3 verify，扩至 6 成员）；解码记录 `workflows mode armed` 标记 **1 次**（L147）、`workflow` 工具调用 + `tool-workflow/run-start`（L149-151，runId `78318d62`）。模型 reasoning 显式应用 skill 纪律（"多角度独立取证 + 对抗验证确有价值…把扇出刻意压到与仓库体量相称"）。琐碎任务 solo 由 eval1 验证（无脚本产出） | 截图 `lab-ultra-tier-chip.png`、`lab-ultra-auto-orchestration.png`；解码：`--match "workflows mode armed"` → 1 match；`--match "dsh-ultracode-repo-review"` → workflow 调用 + run-start |
| 档位切换三态 | ✅ OFF→高阶→极致 三档切换（芯片 aria-label 与 toast 均同步：`档位关闭，按下切到高阶` → `档位为高阶，按下切到极致` → `档位为极致，按下关闭`）；切回 OFF 后 toast `本会话不再注入编排授权` | `lab-ultra-tier-chip.png`（极致态） |
| 5 项显式触发路径（关键词/原话/技能/档位/已存工作流） | ✅ 前四项有实现（插件关键词+原话+本 skill+档位）；已存工作流 dsh 无此概念 ⛔ | 见 seam-gap.md |
| banner 文本版本差异（如实记录） | ⚠️ lab 安装的 `@0.1.5`（npm 已发布）banner 文本为 `[workflows mode armed. Decide first:`；本桌面会话观察到的更新版为 `[workflows mode armed at ultra; ...]`（文本随插件版本演进）。**A/B 判别器是 banner 有无**（OFF=0/ULTRA=1），已成立；"at ultra" 字样差异不影响判别 | 解码对照：OFF 0 matches / ULTRA 1 match（无 "at ultra" 后缀） |

## 5. 评测与迭代（skill-creator 流程）

- ✅ evals.json 4 用例 + 断言（代码块作用域修正后无假阳性）；8 路有/无对照跑完，评分 15/15 vs 15/15
- ✅ benchmark.json/md + 静态评审页 review.html 已生成并打开
- ⏳ 用户人工评审反馈 → iteration 2 —— **用户已明确豁免**（"你就当我满意了"），iteration-1 作为最终交付签收
- 记录：二元断言被官方 workflow 工具描述（注入所有 agent 上下文）污染而无区分度；定性差异以分析员判读记录在 benchmark.md 与首轮汇报

## 覆盖限制（如实）

1. 评测 run 无逐 agent token/耗时（引擎无该遥测）；仅墙钟 1h14m42s。
2. banner 折叠行为的结论基于当前 GUI 投影；升级 dsh-ultracode 或 GUI 后需复核。
3. ~~off vs ultra 行为对照与触发优化 20 查询尚未执行~~ → **已完成**：off/ultra A/B lab 实测（§4）；触发优化 R2 11/11 灵敏度、0/9 误报（§1）。剩余：审批对话框权限确认下的运行提示词可见性（seam-gap #7，本部署默认未触发）；banner 文本随插件版本演进，升级后需复核 §4 的标记计数。
