# 验收实测报告（acceptance）

范围：本方案（skill + 官方 workflow 工具 + dsh-ultracode 插件组合）在真实 dsh 0.2.0-rc.2 桌面部署上的实测证据。逐项对照计划的验收要点；证据含截图（同目录 PNG）与评测产物（`ultracode-workspace/`）。

状态标记：✅ 已验收 · ⏳ 待做 · ⛔ 缺接缝（见 `seam-gap.md`）

## 1. 安装与触发

| 要点 | 结果 | 证据 |
|---|---|---|
| skill 安装到用户层级 | ✅ `~/.dsh/skills/ultracode/`（SKILL.md + references×3，与官方 dsh-dev-reference 目录同构） | 安装命令回显；目录热更新后本会话 `available_skills` 消息即出现 `ultracode` 条目与完整 description |
| description 触发覆盖 | ⏳ 初版已含中英触发词；20 条 should/shouldn't-query 优化待签发执行 | `ultracode-workspace/trigger-eval-draft.json` |
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

| 要点 | 结果 |
|---|---|
| off 档：实质性任务 solo / 普通 subagent，不起 workflow | ⏳ 待对照轮 |
| ultra 档：实质性任务自动编排，琐碎任务 solo（评测 eval1 已验证 skill 侧纪律：无脚本产出） | ⏳ 待对照轮（skill 侧 ✅） |
| 5 项显式触发路径（关键词/原话/技能/档位/已存工作流） | ✅ 前四项有实现（插件关键词+原话+本 skill+档位）；已存工作流 dsh 无此概念 ⛔ |

## 5. 评测与迭代（skill-creator 流程）

- ✅ evals.json 4 用例 + 断言（代码块作用域修正后无假阳性）；8 路有/无对照跑完，评分 15/15 vs 15/15
- ✅ benchmark.json/md + 静态评审页 review.html 已生成并打开
- ⏳ 用户人工评审反馈 → iteration 2
- 记录：二元断言被官方 workflow 工具描述（注入所有 agent 上下文）污染而无区分度；定性差异以分析员判读记录在 benchmark.md 与首轮汇报

## 覆盖限制（如实）

1. 评测 run 无逐 agent token/耗时（引擎无该遥测）；仅墙钟 1h14m42s。
2. banner 折叠行为的结论基于当前 GUI 投影；升级 dsh-ultracode 或 GUI 后需复核。
3. off vs ultra 行为对照与触发优化 20 查询尚未执行。
