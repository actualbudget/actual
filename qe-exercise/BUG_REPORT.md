# Bug Report: No validation on budgeted amount input

## Summary

The budgeted-amount field on the Budget page accepts negative numbers verbatim and
silently coerces non-numeric or empty input to `0.00`, instead of rejecting or clamping
either case. Found while resolving B6's expected result (`qe-exercise/TEST_PLAN.md`) by
exercising the running app directly, rather than assuming the correct behavior.

## Steps to reproduce

1. Open the app, "Try the demo" (or any budget file).
2. On the Budget page, click a category's budgeted-amount cell to open it for editing.
3. Type `-50` and press Enter.
4. Repeat on the same or another category, typing `abc` (or clearing the field entirely)
   and pressing Enter.

## Expected vs. actual

| Input     | Expected (typical budgeting-app behavior)  | Actual                                                                                             |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `-50`     | Rejected, or clamped to `0`                | Accepted verbatim — category balance goes negative by that amount, with no warning or confirmation |
| `abc`     | Rejected, input reverts to its prior value | Silently coerced to `0.00`                                                                         |
| _(empty)_ | Rejected, input reverts to its prior value | Silently coerced to `0.00`                                                                         |

Confirmed directly against the running app (not inferred from source) — see
`AI_WORKFLOW.md`'s "Corrections and findings" for how this was verified.

## Where it happens

The budgeted-amount cell's `onSave` handler
(`packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx`,
around the `budget-${cat.id}` field) calls `onBudgetAction(month, 'budget-amount', {
category: category.id, amount: parsedIntegerAmount ?? 0 })` — the `?? 0` fallback is what
coerces unparseable input to zero. Nothing in that path checks for `amount < 0` either.
Not something we changed or need to change as part of this exercise; noted here as a
found defect, not fixed.

## Severity

**Low.** Not data-destructive and not silently wrong in a way a user would fail to notice
(a negative budgeted amount is visually obvious in the category row), but it's a genuine
input-validation gap: a mistyped amount (extra keystroke, autocomplete mis-fill) is
accepted without feedback instead of being caught at entry. Worth a validation pass on
this field, not urgent.

## Related test coverage

`budget-workflow.test.ts`'s **B6** asserts this exact behavior (as currently implemented,
not as it "should" behave) so a future fix to add validation would be a deliberate,
visible change to that test rather than an unnoticed regression.
