BudgetTable.tsx:261 Error: Mixed calendar month and pay period ranges are not allowed. Range from '2025-31' (pay period) to '2026-09' (calendar month) is invalid. Use either all calendar months (e.g., '2024-01' to '2024-03') or all pay periods (e.g., '2024-13' to '2024-15').
at \_range (months.ts:362:11)
at Module.rangeInclusive (months.ts:471:10)
at MonthsProvider (MonthsContext.tsx:46:18)

The above error occurred in the <MonthsProvider> component.

React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.
<MonthsProvider>
BudgetTable @ BudgetTable.tsx:261
<BudgetTable>
DynamicBudgetTableInner @ DynamicBudgetTable.tsx:140
<DynamicBudgetTableInner>
children @ DynamicBudgetTable.tsx:167
<AutoSizer>
DynamicBudgetTable @ DynamicBudgetTable.tsx:165
<DynamicBudgetTable>
BudgetInner @ index.tsx:460
<BudgetInner>
Budget @ index.tsx:529
<Budget>
LoadComponentInner @ LoadComponent.tsx:85
<LoadComponentInner>
LoadComponent @ LoadComponent.tsx:21
<LoadComponent>
NarrowAlternate @ index.tsx:24
<NarrowAlternate>
FinancesApp @ FinancesApp.tsx:258
<FinancesApp>
AppInner @ App.tsx:164
<AppInner>
App @ App.tsx:242
<App>
(anonymous) @ index.tsx:97
