==============================================================================
Actual Budget — 三个 issue 修复说明（软件工程课程作业 A1）
分支：assignment/fix-issues-3759-1062-1957
基线：origin/master @ b05c20712
==============================================================================

本分支在 master 之上提交了 4 个源代码改动，修复了 actualbudget/actual
仓库中三个长期 open 的 issue。所有改动均位于 packages/loot-core 内，
不涉及 UI/Electron，便于在 Node 环境中演示与验证。

------------------------------------------------------------------------------
0. 受影响文件一览
------------------------------------------------------------------------------
  packages/loot-core/src/server/transactions/transaction-rules.ts        (修改)
  packages/loot-core/src/server/transactions/transaction-rules.test.ts   (新增测试)
  packages/loot-core/src/shared/schedules.ts                             (修改)
  packages/loot-core/src/shared/schedules.test.ts                        (新增测试)

新增测试合计 10 条；现有测试全部保持通过；yarn typecheck 通过。

------------------------------------------------------------------------------
1. Issue #3759 — Rule deduplication
    https://github.com/actualbudget/actual/issues/3759
------------------------------------------------------------------------------

【现象】
用户已经创建了一条规则
    payee oneOf [grocery_A, grocery_B, …] -> category: Food
随后给 grocery_A 的交易记录手动分类为 Food（重复多次后），系统会
**自动**再生成一条规则
    payee is grocery_A -> category: Food
这条 is-规则在功能上完全被原有 oneOf-规则覆盖，造成视觉冗余、误导
用户以为规则被改坏。issue 在 GitHub 已 open 数月无人处理。

【根因】
loot-core 的 updateCategoryRules() 会根据用户的重复分类行为自动学习
"payee → category" 规则。但它在判断"是否已存在规则"时**只查询了**
`getIsSetterRules()`，没有查 `getOneOfSetterRules()`，于是 oneOf
规则被忽略，自动学习函数继续追加新的 is-规则。

【修复】
在 transaction-rules.ts 的自动 insert 之前增加一道护栏：

    const oneOfCovering = getOneOfSetterRules(null, 'payee', 'category', {
      condValue: payeeId,
      actionValue: category,
    }).next().value;
    if (!oneOfCovering) {
      // 仍然走原有的 new Rule({...}) + insertRule(...)
    }

也就是：若已有 oneOf 规则把同一 payee 映射到**同一** category，则
跳过创建。若 oneOf 映射到**不同** category，仍允许新建 is-规则（用户
显式覆盖）。

【新增测试】packages/loot-core/src/server/transactions/transaction-rules.test.ts
  - "does not create redundant `is` rule when a `oneOf` rule already covers
     the payee with the same category (#3759)"
  - "still creates an `is` rule when the existing `oneOf` rule covers the
     payee but with a different category"

------------------------------------------------------------------------------
2. Issue #1062 — Monthly schedule skips months without day 31/30/29
    https://github.com/actualbudget/actual/issues/1062
------------------------------------------------------------------------------

【现象】
创建一条月度循环 schedule，起始日 = 5 月 31 日。
预期：5/31、6/30、7/31、8/31、9/30、10/31……
实际：5/31、7/31、8/31、10/31、12/31……（6、9、11、2 月被跳过）

【根因】
schedules.ts 的 recurConfigToRSchedule() 把月度 schedule 翻译成
RFC 5545 BYMONTHDAY 规则交给 rSchedule 库。RFC 5545 规定 BYMONTHDAY=31
在 6 月这种没有 31 日的月份直接 **无事发生**——这是规范行为，但它
显然不是普通用户期待的"每月最后那一天扣款"。

【修复】
仍在 recurConfigToRSchedule() 内，但对**起始日 ≥ 29 且 endMode ≠
after_n_occurrences** 的特殊情况，把原本一条 rule 拆成两条，组合
得到正确语义：

    rules[0] = { byMonthOfYear: 含该日的月份, byDayOfMonth: [startDay] }
    rules[1] = { byMonthOfYear: 其余月份,     byDayOfMonth: [-1] }   // 月末

举例：startDay = 31
    rules[0].byMonthOfYear = [1,3,5,7,8,10,12], byDayOfMonth = [31]
    rules[1].byMonthOfYear = [2,4,6,9,11],      byDayOfMonth = [-1]
    => 5/31, 6/30, 7/31, 8/31, 9/30, 10/31, 11/30, 12/31, ...

对 startDay = 30 / 29 同理。byDayOfMonth = -1 在 2 月会自动适配
平/闰年（28 / 29）。

【边界限制（已在代码注释中说明）】
- endMode = after_n_occurrences 时跳过这条优化，避免两条 rule 各取
  N 次出现导致总次数翻倍。该 case 保持原有 RFC 行为。

【新增测试】packages/loot-core/src/shared/schedules.test.ts
  - 验证 5/31 起始时 6 月 fallback 到 6/30、闰年 2024 / 平年 2025
    fallback 到 Feb 29 / Feb 28；
  - 验证 1/30 起始时 2 月 fallback；
  - 验证 1/28 起始时**不**触发 fallback 路径（避免回归）。

------------------------------------------------------------------------------
3. Issue #1957 — 提前过账后 schedule 在 upcoming 中复活
    https://github.com/actualbudget/actual/issues/1957
------------------------------------------------------------------------------

【现象】
有一条月度账单 schedule，next_date = 11/30。用户在 11/20 提前付款，
点了 "post transaction" 把交易过账并把日期改成 11/20。下一次同步
后，这条 schedule 又在 upcoming 列表里出现，仿佛 11 月还没付。

【根因】
shared/schedules.ts 的 getHasTransactionsQuery() 决定"本周期是否已
存在交易"时使用了一个固定 2 天的 date 下限：

    $gte: monthUtils.subDays(schedule.next_date, 2)

11/20 < 11/30 - 2 = 11/28，所以这笔提前 10 天的交易被错误地排除，
schedule 的状态从 paid 跌回 due/upcoming，advanceSchedulesService
看到状态非 paid 也就不会把 next_date 往前推。

【修复】
新增导出函数 getScheduleHasTransactionsLowerBound(nextDate, dateCond)，
基于 frequency × interval 自动算出"上一个周期"的边界（最少 1 天，
最多到上一个周期日的前一天）：

    daily   -> 0
    weekly  -> 7 * interval - 1
    monthly -> 28 * interval - 1      // 取最短的二月跨度做保守值
    yearly  -> 365 * interval - 1
    op==='is' (一次性) -> 不回看，仍用 next_date

为什么是"周期 - 1"？保证：(a) 本周期内提前若干天付款的交易仍计入；
(b) **上一个周期**的交易不会被错误计入本周期。例：next_date = 11/30
的月度 schedule，lower bound = 11/03，11/20 命中、10/30 不命中。

getHasTransactionsQuery() 改为统一调用新函数，旧的两套分支（is /
posts_transaction / 否则）合并到一处实现。

【新增测试】packages/loot-core/src/shared/schedules.test.ts
  - 5 条单元测试覆盖一次性 / monthly / weekly / interval=2 / daily 等
    分支与边界。

==============================================================================
如何向老师演示
==============================================================================

环境准备（只需做一次）
  > corepack enable
  > corepack prepare yarn@4.9.1 --activate
  > corepack yarn install
  Windows PowerShell 中若出现路径乱码，先执行：  chcp 65001

演示脚本（建议按顺序）
------------------------------------------------------------------------------

(A) 展示分支与改动范围
    > git checkout assignment/fix-issues-3759-1062-1957
    > git log master..HEAD --oneline
    > git diff --stat master..HEAD
    说明：只动了 4 个文件，全部在 loot-core。

(B) 静态检查通过
    > corepack yarn workspace @actual-app/core run typecheck
    末尾应输出："All files passed"。

(C) 演示 Issue #3759（规则去重）
    > corepack yarn workspace @actual-app/core run test:node transaction-rules
    找到这两条新增 test，应当 passed：
      does not create redundant `is` rule when a `oneOf` rule already covers
        the payee with the same category (#3759)
      still creates an `is` rule when the existing `oneOf` rule covers the
        payee but with a different category
    若要直观看修复差异：
      > git diff master -- packages/loot-core/src/server/transactions/transaction-rules.ts
    重点解释 if (!oneOfCovering) 那段护栏。

(D) 演示 Issue #1062（月度 31 日跳月）
    > corepack yarn workspace @actual-app/core run test:node shared/schedules
    找到 3 条新增 test 全 pass：
      falls back to the last day of the month for monthly schedules
        starting on the 31st (#1062)
      falls back to the last day of the month for monthly schedules
        starting on the 30th (#1062)
      still produces 28th-day schedules without month-end fallback
    如果时间充裕：
      > git diff master -- packages/loot-core/src/shared/schedules.ts
    展示 recurConfigToRSchedule 内多 rrule 拆分的逻辑（"month with day"
    vs "month without day"）。

(E) 演示 Issue #1957（提前付款后 schedule 复活）
    与 (D) 在同一份 test 文件，找到 describe 块
      getScheduleHasTransactionsLowerBound (#1957)
    5 条 test 全 pass。
    可以现场口算：next_date 11/30，月度 schedule，lower bound 是
    11/30 - 27 = 11/03。Q&A 友好。

(F) （可选）整体回归
    > corepack yarn workspace @actual-app/core run test:node shared
    或：
    > corepack yarn workspace @actual-app/core run test:node server/schedules
    展示没有引入回归（server/schedules/app.test.ts 15/15 通过）。

注意：仓库根目录 yarn test 会跑全部 workspace，速度慢且 master 上有
两个 pre-existing flaky test（src/server/main.test.ts / aql/executors）
和我们的改动无关。若演示时跑出现这两个失败，请向老师说明并展示
git stash 我们的改动后它们仍失败的事实（已在本仓库本地验证过）。

------------------------------------------------------------------------------
如何把每条修复对应到 GitHub issue 提交 PR
------------------------------------------------------------------------------
仓库 CONTRIBUTING / AGENTS.md 要求：
  1. commit / PR title 加 [AI] 前缀（本作业用 Cascade 协助实现）；
  2. 在 upcoming-release-notes/<PR号>.md 里加一条 release note
     （本仓库内全局规则禁止 AI 写 .md 文件，因此请同学手工补充，
      格式参照 upcoming-release-notes/7691.md）。

提交 PR 时推荐拆成 3 个分支，每个 issue 一个 PR：
  - fix/3759-rule-dedup       -> 只 cherry-pick rules 改动
  - fix/1062-monthly-31       -> 只 cherry-pick schedules.ts 中 recurConfigToRSchedule 部分
  - fix/1957-early-post       -> 只 cherry-pick schedules.ts 中 lower-bound 部分

如果只需要交一个 PR，本分支 assignment/fix-issues-3759-1062-1957
即可直接 push 提交，PR 描述里链接三个 issue。
==============================================================================
