# Reusable Agent Brief: E2E Coverage Gap Assignment

A generalized prompt/spec for directing an AI coding agent through the
workflow used in this assignment: given a codebase, find the highest-value
untested feature(s), write a defensible test plan, audit it, then implement
it. Adapt the bracketed placeholders for a new project.

---

## Step 0 — Orient (read-only)

```
Read [existing e2e test files / test directory] and summarize, in plain
English, what each file already tests and what's conspicuously missing.
Don't write any code yet — investigate and report back.
```

Why this step exists: it forces the agent to build an accurate model of
current coverage before opinions form. Skipping straight to "pick a feature"
produces recommendations anchored on nothing.

## Step 1 — Force a real prioritization pass (not a default)

```
In your opinion, what are the [N] highest-priority features I should cover
in this assignment? Give me just reasoning, not code.
```

**Do not accept the first answer if it's obviously anchored on whatever the
agent looked at most recently** (recency bias is the most common failure mode
here — an agent will default to extending whatever's already in its context
window rather than surveying the whole codebase fresh). If the reasoning
reads as a rationalization rather than a comparison, push back explicitly:

```
Are you sure those are the highest priority? Compare against [alternative
features] too.
```

This single question, asked twice in this session, is what separated the
final feature choices (envelope-budget money actions, account reconciliation)
from the agent's initial defaults (Rules, Schedules) — the initial defaults
weren't wrong exactly, just under-justified relative to what a fresh
comparison turned up.

## Step 2 — Ground the recommendation in the actual code

```
Go look at [feature]'s current test coverage before I decide. Trace the
actual component/handler code, don't just infer from file names.
```

An agent's untested claim ("this seems important") is not evidence. Have it
grep for the relevant components, read the handler logic, and cite specific
file names, component names, and test titles (or their absence). This is what
turns "budgeting seems core to the product" into "`BalanceMenu`, `CoverMenu`,
and `ToBudgetMenu` are fully tested on mobile but have zero desktop coverage"
— a claim someone can verify in thirty seconds.

## Step 3 — Draft the test plan

```
Write a test plan for [feature(s)] as a markdown file: test case IDs,
one-line titles, priority (P0/P1/P2), and detailed numbered steps for the
highest-priority cases. Don't write Playwright code yet.
```

Keep code and planning phases separated — reviewing a test plan in prose is
much cheaper than reviewing it embedded in test code, and catches scope
problems before any implementation cost is sunk.

## Step 4 — Audit the draft as a separate pass

```
Let's walk through the test plan and audit what test cases we actually need
and whether each one is valuable. For each case: keep, cut, or merge, with
reasoning.
```

This is the step most likely to be skipped, and the one with the highest
payoff. A first-draft test plan reliably contains: (a) cases that are really
just assertions that belong inside another case's setup (e.g. "menu item X is
hidden when condition Y" — usually cheaper to assert inline than as a
standalone case), and (b) cases exercising a shared utility rather than the
feature itself (arithmetic parsing, date formatting) that are unit-test
concerns wearing an e2e costume. A dedicated audit pass catches both, and
often surfaces one or two genuinely new gaps the first pass missed, because
re-reading the source with "is this worth testing" as the explicit question
surfaces things skimming for "what does this do" does not.

Expect the case count to go down, not up. If the audit doesn't cut anything,
the first draft was probably already over-filtered, or the audit wasn't done
critically enough.

## Step 5 — Implement incrementally, with review checkpoints

```
Implement [feature]'s tests now. Extend the existing page-object model
pattern rather than inlining selectors in the test file.
```

Apply changes in reviewable chunks (one feature/file at a time) rather than
one large diff — it's the only way a rejected/interrupted edit doesn't cost
the whole batch of work.

## Anti-patterns observed / to avoid

- **Accepting the agent's first feature pick.** It will almost always be
  anchored on recent context rather than a fresh survey. Ask "why not X
  instead?" before committing.
- **Skipping the audit step and going straight from draft plan to code.**
  The draft plan is optimized for "did I think of enough cases," not "is each
  case worth the maintenance cost." Those are different questions and need a
  separate pass.
- **Letting the agent cite a feature's existence as evidence it's tested.**
  Always require a specific test title, file, or explicit "no coverage found"
  — not "this is probably covered somewhere."
- **One giant diff.** If a tool-use gets rejected or interrupted mid-batch,
  smaller checkpoints mean you lose minutes of work, not the whole session.
