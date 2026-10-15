# dsh workflow 脚本契约

dsh `workflow` 工具的硬契约（宿主强制执行）与可信脚本约定。硬契约违反的后果是脚本不跑或报错；约定决定脚本是否值得复用。本文件依据 dsh 0.2.0-rc.2 的 `@deepseek-ai/dsh-tool-workflow` 与 `@deepseek-ai/dsh-workflow-ptc` 实现核对；与 Claude Code 的差异已逐条标注。

## 目录

1. [硬契约（宿主强制）](#1-硬契约宿主强制)
2. [钩子精确语义](#2-钩子精确语义)
3. [约定](#3-约定)
4. [完成脚本检查表](#4-完成脚本检查表)

---

## 1. 硬契约（宿主强制）

### 1.1 `meta` 是工具参数，不是脚本语句

与 Claude Code（脚本首行 `export const meta = {...}` 纯字面量）**不同**：dsh 把 `meta` 作为工具调用的独立 JSON 参数提交，引擎在执行脚本体之前做 schema 校验，无效即拒绝。

```jsonc
// 工具调用参数（不是脚本内容）
"meta": {
  "name": "review-changes",            // 必填：短 kebab-case（展示 + 持久化键）
  "description": "按维度评审变更并对每条发现做验证",  // 必填：一句话
  "whenToUse": "提交后想跨维度评审时",   // 可选：何时适用
  "phases": [                          // 可选：仅用于进度分组
    { "title": "Review", "detail": "按维度并行评审" },
    { "title": "Verify", "detail": "对每条发现做对抗验证" }
  ]
}
```

**写进脚本的 `export const meta` 会直接解析失败**——脚本是纯脚本体（非模块），`export` 语法非法。`meta.phases[].title` 与 `phase('...')` 及 `agent(..., {phase: '...'})` 的字符串**精确匹配**；不匹配的 `phase()` 调用自成一个进度组（不报错，但进度树里出现计划外分组）。

### 1.2 纯 JavaScript 脚本体

- 不是 TypeScript：类型注解、interface、泛型解析失败。
- 不是模块：没有 `import`/`export`；`require`/`process`/`setTimeout`/`fetch` 等 Node 全局不存在（宿主测试确认 `typeof process === 'undefined'`）。
- 顶层 `await` 合法；以 `return <value>` 结尾，返回值即工具结果（`undefined` 映射为 `null`）。
- 标准内置（`JSON`、`Math`、`Array`、`Map`、`Set`、`Date`）**可用**——与 Claude Code 不同，dsh 没有 resume 缓存要保护，因此不禁用 `Date.now()`/`Math.random()`（但见 1.4：返回值仍必须是纯 JSON）。
- 无文件系统、网络、子进程访问——所有 I/O 由子 agent 完成。
- `meta` 与 `args` 以普通 JSON 数据到达脚本，绝不作为代码求值。
- 同步死循环会被同步超时机制杀掉并以错误终止运行（异步等待子 agent 不受此限）。

### 1.3 返回值必须是纯 JSON

物化到宿主的值必须是纯 JSON 数据：对象/数组/字符串/数字/布尔/`null`。返回含 `Date`、`Map`、`Set`、类实例、循环引用的值 → 运行以错误终止（"the workflow's return value is not plain JSON data"）。`agent()` 的选项同样必须是 plain JSON——传 `new Date()` 会被拒。

### 1.4 上限（引擎配置，脚本不可改）

| 上限 | 默认 | 触发后果 |
|---|---|---|
| 单次 `parallel()`/`pipeline()` 条目数 | 4096 | `fatal` 错误："over the per-call cap… split the work" |
| 单次运行 `agent()` 总数 | 1000 | `fatal` 错误："runaway-loop backstop" |
| 并发 agent 数 | 机器自动解析（配置项 `maxConcurrentAgents`） | 超出的调用 **FIFO 排队**，不报错 |
| 同步执行 | 同步超时 | 脚本以 "Script execution timed out" 终止 |

消费方（工具层/引擎配置）可以**调低**单次运行的 `agent()` 总数；脚本钩子不能改任何上限。

### 1.5 失败纪律（fatal vs 逐项 null）

- 钩子误用——错误参数、未知或非 plain-JSON 的 `agent()` 选项、超出 schema 支持子集、超上限、取消——抛 `fatal: true` 的 `WorkflowError`。
- `parallel()`/`pipeline()` 对 fatal 错误**直接重抛**而非把该项映射为 `null`：一个拼错的选项必须响亮地终止脚本，绝不溶解成看似普通的子 agent 失败。
- 逐项 `null` 保留给：子运行失败（非 `completed` 的停止原因）与阶段内的普通脚本错误。
- `agent()` 解析为 `null` 的情形：子 agent 失败或运行被取消。**每个结果路径都要守卫 `null`。**

### 1.6 运行形态与取消

- 前台执行（**省略 `run_in_background` 时的默认**）：工具调用等待运行结束，父轮次挂起；结果包络 `{ kind: 'foreground', runId, agentsStarted, result }`，渲染为 `workflow "<name>" completed (N agents).` + 返回值 JSON。**这是例外路径**——只在用户明确要求等结果、且本轮无其他独立工作可做时使用。
- `run_in_background: true`（**ultracode 的常规调用方式**；配置允许时默认可用）：立即返回 `{ kind: 'background', jobId, runId }`，主对话不被阻塞；运行以自有 `workflow` 任务注册进 `ctx.jobs`——任务环**实时流出** `phase()`、`log()` 与成员生命周期行；完成通知携带渲染后的返回值（模型结算后首次 `job_output` 亦会再给一次）。依赖结果的正确姿势是"后台启动 → 先做独立工作 → `job_output(wait: true)` 收"，不是前台干等。取消途径：`job_kill`、任务列表停止控件；没有工具步骤信号能到达该运行。
- 取消与失败返回 `Error: workflow run was cancelled` / `Error: workflow run failed: <error>`；部分输出绝不报告为成功。
- 子 agent 的中间消息**不会**进入父对话；父级只看到最终结果。

## 2. 钩子精确语义

```js
// 返回最终文本；带 schema 时返回校验过的对象
const out = await agent(prompt, {
  label: 'verify:login.ts',   // 展示标签（进度树里的成员名）
  phase: 'Verify',            // 进度分组——pipeline 阶段内必须用它（全局 phase() 会竞争）
  schema: VERDICT_SCHEMA,     // JSON Schema → 返回校验对象；省略 → 返回文本
  provider: 'deepseek',       // 可选：独立的 LLM 目标覆盖（可单独提供）
  model: 'deepseek-v3',       // 可选：模型覆盖（可单独提供）
  // 除以上五项外的任何选项都会被响亮拒绝并终止脚本：
  // effort / isolation / agentType / stallMs / … 不存在
})
```

- **`pipeline(items, ...stages)`**：每条目独立走完各阶段，**阶段间无屏障**——条目 A 可在第 3 阶段而条目 B 还在第 1 阶段。每阶段收到 `(prevResult, originalItem, index)`；用 `originalItem`/`index` 给后续阶段贴标，不必把上下文穿过返回值。阶段抛错 → 该条目变 `null` 并跳过其剩余阶段。**多阶段工作的默认选择。**
- **`parallel(thunks)`**：传零参函数数组（`items.map(x => () => agent(...))`），并发等待**全部**完成——屏障。抛错的 thunk 解析为 `null`，调用本身永不 reject。仅当某阶段真需要前一阶段的全部结果时使用。
- **`phase(title)`**：为随后的顶层 `agent()` 调用开进度组；**`log(message)`**：向用户发一行叙述（进度树上方）。两者都只影响展示，无执行语义。
- **`args`**：工具 `args` 参数的逐字 JSON。裸数组要包成字段（`{"files": [...]}`）。脚本无 `args` 时为 `undefined`——防御式读取。
- **schema 支持子集**：根为 `{type: 'object', properties}`、`required ⊆ properties`；可用关键字仅 `type/properties/required/additionalProperties/items/enum/const/oneOf`（无 `pattern`/`format`/数值边界）。超出子集 → 启动前 fatal。子 agent 被要求经结构化输出工具返回，校验在工具层完成，不匹配会重试。
- **子 agent 的最终文本就是返回值**：它面向脚本数据而非人类消息；让子 agent 返回原始数据（配合 `schema` 最稳），不要返回寒暄。
- **易混点**：`subagent` 工具（委派用）有 `reasoning_effort` 参数，`workflow` 脚本里的 `agent()` **没有**——0.2.0-rc.2 引擎白名单只有 `label/phase/schema/provider/model`，写了会被 `UNSUPPORTED_OPTION` 拒绝（`effort`/`isolation`/`agentType` 属 deferred，同样拒绝）。审别人的脚本时别把 subagent 工具的词汇搬进脚本契约。

## 3. 约定

### args

- 用户用自然语言给输入，你把它抽成**结构化数据**（字符串/数组/对象）放进 `args`，脚本直接读——绝不字符串解析 `args`。
- 缺必填 args → 早返回 `{ error: '…usage…' }`，不要抛。
- 破坏性能力永远 opt-in（`apply`/`fix` 默认 `false` = 只报告）。
- 脚本头注释写清 args 形状。

### schema

- 每个跨 agent 边界一个 schema，定义为顶层 `const`；自由文本只留给给人看的报告字段。
- 让 schema 字段承担设计工作：字段的 `description` 是模型看得见的提示词；`failureScenario`、`predictions`、`support` 这类字段是下游验证的抓手——schema 与验证者要一起设计。
- 下游代码要分支的字段（严重度/裁决/状态）用 `enum`。

### 提示词（子 agent 是全新上下文）

每个提示词自包含，包含：

- 任务 + **charter 与 anti-charter**（找什么、忽略什么、哪位同伴负责它）——这是 N 个并行 agent 不产出 N 份相同答案的保障；
- 上游数据**内联**（`JSON.stringify` 进去——子 agent 看不到你的变量）；
- 诚实阀："空列表是合法结果"、"跑不了就说跑不了，别模拟"、"坏消息好过假绿"；
- 对抗验证者：不确定性下的默认裁决（反驳 vs 保留），按错误代价不对称选；
- 只读调查：只读规则写进**每一个**提示词，不只写第一个。
- 结论保持短：要点+证据+文件:行号，大块材料落文件、回传路径（呈现纪律）。

### 结构

- 顶层阶段间 `phase()`；pipeline 内 `{phase}` 选项；关键节点 `log()`（轮次产出、上限、提前中止）——用户看叙述线。
- 每个 `parallel()` 屏障写辩护注释；写不出辩护就是 pipeline。
- 上限截断必须 `log()` 并写进返回值（no silent caps）。
- 循环：硬上限 + 收敛条件，结果说明是哪一条触发（`dry: false` = "被上限停住，井未必干了"）。
- 返回结构化对象；大段文字收进一个 `report` 字段，其余保持可查询。
- 需要用户决策的未知 → 返回 `openQuestions`/`assumptions`，会话层收集答案走下一次 `args`（工作流没有交互原语，`log()` 是单向的）。

### 模型选择

默认继承会话模型；`provider`/`model` 覆盖要慎用——只在对某个阶段有明确的强理由时（比如廉价机械阶段想换小模型）。没有逐 agent 的 effort 概念，用提示词复杂度和阶段结构控制成本。

## 4. 完成脚本检查表

- [ ] 头注释：用例、何时用、args 形状、演示了哪些模式、输出形状
- [ ] `meta` 作为工具参数提交；`name` kebab-case；`phases` 标题与 `phase()`/`{phase}` 精确对齐
- [ ] 脚本里**没有** `export const meta`、没有 `import`/`export`、没有 TS 语法
- [ ] `agent()` 只用了 `label/phase/schema/provider/model` 五个选项
- [ ] schema 全部定义；分支字段用 `enum`；字段 description 在做提示词工作
- [ ] 必填 args 校验 + usage 早返回
- [ ] 每个 `parallel()` 屏障有辩护注释；pipeline 内用 `{phase}` 而非全局 `phase()`
- [ ] 每处 `parallel()`/`pipeline()` 结果 `.filter(Boolean)` 意识到位；`null` 路径以诚实结果收尾
- [ ] 上限与截断已 `log()` 且返回；循环有硬上限 + 收敛信号 + 结果状态区分
- [ ] 破坏性行为 opt-in、漏斗化、事后全局验证
- [ ] 返回值纯 JSON（无 `Date`/`Map` 实例）
- [ ] 交付前做了静态审查（读完源码而非试跑）
