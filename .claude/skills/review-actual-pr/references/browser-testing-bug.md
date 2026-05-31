# Browser testing playbook: bug PR

For bug PRs we want **two pieces of evidence**: that the bug existed before the fix (reproduce on `edge.actualbudget.org`), and that it doesn't anymore (try the same repro on the PR's Netlify preview). Both are needed — a fix that "looks right" in code but doesn't actually change runtime behavior is a regression waiting to happen, and a bug that doesn't reproduce on edge means the fix may be addressing a phantom.

## Constants

- `EDGE_URL = https://edge.actualbudget.org/`
- `PREVIEW_URL = https://deploy-preview-<num>.demo.actualbudget.org/` (substitute the PR number)
- Output dir: `~/Downloads/pr-review-<num>/`

## Step 1 — derive a reproduction plan from the PR

From the PR title, body, and any linked issue, write a short ordered list of steps to trigger the bug. Be concrete: "Open Reports → click Cash Flow → set date range to last month → expect chart, observe blank canvas." If the PR doesn't say enough to derive a repro, fetch the linked issue:

```bash
# extract issue number from "Fixes #1234" / "Closes #1234"
ISSUE_NUM=...
gh issue view $ISSUE_NUM --repo actualbudget/actual --json title,body,labels
```

If after reading the linked issue you still don't have a clear repro, **stop the testing phase and tell the user**. Don't make one up.

## Step 2 — reproduce on edge

```bash
playwright-cli open $EDGE_URL
playwright-cli snapshot
```

Standard demo setup (per `AGENTS.md`):

1. Click "Don't use a server".
2. Click "View demo".

Wait for the budget to load. Then walk the repro plan one step at a time, taking a snapshot after each step so the next click has fresh element refs. When you hit the failure state, capture it:

```bash
playwright-cli screenshot --filename=$HOME/Downloads/pr-review-<num>/before-edge.png
```

Note in your running summary: did the bug reproduce as described? If not, that's an important finding — say so in the report and stop. The fix may be defensive, addressing a path that's hard to hit, in which case escalate to the user with what you saw.

If the demo data doesn't have what's needed (e.g., the bug requires a multi-currency setup and demo is single-currency), surface that and stop. Don't fabricate.

## Step 3 — verify on preview

Close edge and open the preview:

```bash
playwright-cli close
playwright-cli open $PREVIEW_URL
playwright-cli snapshot
```

If the page returns a 404 or "site not found", wait ~10 seconds and reload once — Netlify deploys can lag the GitHub PR event. If it's still broken, stop testing, report the preview URL didn't load, and ship the code review without the testing section. Don't try to test against a stale build.

Repeat the demo setup and the same repro steps. Capture the result:

```bash
playwright-cli screenshot --filename=$HOME/Downloads/pr-review-<num>/after-preview.png
```

## Step 4 — verdict

State three things plainly in the report's Testing section:

- `Bug reproduces on edge: yes / no`
- `Bug reproduces on preview: yes / no`
- `Verdict: fix confirmed | fix not observable | repro inconclusive`

Truth table:

| Edge | Preview | Verdict                               |
| ---- | ------- | ------------------------------------- |
| yes  | no      | **fix confirmed**                     |
| yes  | yes     | **fix not observable** — escalate     |
| no   | no      | **repro inconclusive** — describe why |
| no   | yes     | **regression** — the PR made it worse |

The "regression" case is rare but important; if it ever fires, mark it Critical in the code review section too.

## Notes

- If the bug is visual (layout, color, alignment), prefer the same viewport on both URLs: `playwright-cli resize 1280 800` before each setup. Otherwise differing default sizes can mask or fake the difference.
- For bugs in transaction lists or reports, the demo budget's data may be too small to show the issue. If you suspect that, say so — don't pad with "looks fine" when you didn't actually exercise the code path.
