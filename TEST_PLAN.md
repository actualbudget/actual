# Test Plan: Budget Category Management & Envelope Budgeting

## 1. Feature Overview

**Feature:** Budget Category Management and Envelope Budgeting

**Description:** 
Actual Budget implements the envelope budgeting methodology, where users allocate their income into different "envelopes" (categories) for specific purposes. This feature allows users to create budget categories, allocate funds to them, track spending, and manage their monthly budget following the envelope budgeting principle.

**Envelope Budgeting Concept:**
- Every dollar is assigned a job (allocated to a category)
- Money is divided into virtual "envelopes" for different spending purposes
- Spending is tracked against each envelope's allocation
- Users can move money between envelopes as needed

**User Story:**
As a user, I want to create budget categories (envelopes), allocate my income to different spending categories, and track my spending against my budget so that I can manage my finances effectively using the envelope budgeting method.

## 2. Scope

### In Scope:
- Creating new budget categories (envelopes)
- Allocating funds to categories
- Budget calculations (budgeted, spent, balance)
- Moving money between categories (envelope transfers)
- Category group management
- Budget summary calculations (Available funds, To Budget)
- Overspending scenarios
- Monthly budget view and navigation

### Out of Scope:
- Budget goals/templates (complex feature, separate test suite)
- Multi-month budget planning
- Budget reports
- Mobile budget view
- Bank sync integration
- Transaction creation (covered in existing tests)

## 3. Test Environment

- **Application:** Actual Budget (local instance)
- **URL:** http://localhost:3001
- **Browser:** Chromium (Playwright default)
- **Test Framework:** Playwright
- **Test Data:** Demo budget file with pre-existing categories
- **Budgeting Method:** Envelope Budgeting

## 4. Test Cases

### Test Suite 1: Category Creation and Management

#### TC-001: Create a New Budget Category (Envelope)
**Priority:** High  
**Preconditions:** User is logged in and viewing the budget page

**Test Steps:**
1. Navigate to budget page
2. Click on "Add Category" button
3. Enter category name: "Groceries Test"
4. Select category group: "Usual Expenses"
5. Click "Save" or press Enter

**Expected Results:**
- New category "Groceries Test" appears in the "Usual Expenses" group
- Category has 0.00 budgeted amount (empty envelope)
- Category has 0.00 spent amount
- Category has 0.00 balance
- Category is ready to receive budget allocation

**Test Data:**
- Category Name: "Groceries Test"
- Category Group: "Usual Expenses"

---

#### TC-002: Create a New Category Group
**Priority:** High  
**Preconditions:** User is logged in and viewing the budget page

**Test Steps:**
1. Navigate to budget page
2. Click on "Add Group" button
3. Enter group name: "Savings Goals"
4. Click "Save"

**Expected Results:**
- New category group "Savings Goals" appears in the budget
- Group is empty (no categories)
- Group can be collapsed/expanded
- Group can contain multiple categories

**Test Data:**
- Group Name: "Savings Goals"

---

### Test Suite 2: Budget Allocation (Filling Envelopes)

#### TC-003: Allocate Funds to a Category
**Priority:** High  
**Preconditions:** 
- User is logged in
- Budget has available funds (To Budget > 0)
- Category exists

**Test Steps:**
1. Navigate to budget page for current month
2. Note the current "To Budget" amount
3. Locate category "Food"
4. Click on the "Budgeted" cell for "Food"
5. Enter amount: "500.00"
6. Press Enter or click outside

**Expected Results:**
- Budgeted amount for "Food" shows "500.00"
- "To Budget" amount decreases by 500.00
- Balance for "Food" increases by 500.00
- Changes are saved automatically
- Envelope now has $500 allocated

**Test Data:**
- Category: "Food"
- Amount: 500.00

---

#### TC-004: Allocate All Available Funds (Zero-Based Budget)
**Priority:** High  
**Preconditions:** 
- User is logged in
- Budget has available funds showing in "To Budget"

**Test Steps:**
1. Navigate to budget page
2. Note the "To Budget" amount (e.g., 1,000.00)
3. Allocate funds to various categories until "To Budget" = 0.00
4. Verify all income is allocated

**Expected Results:**
- "To Budget" reaches exactly 0.00
- All income is assigned to categories (envelopes)
- Budget follows zero-based budgeting principle
- No unallocated money remains

**Test Data:**
- Initial "To Budget": 1,000.00
- Final "To Budget": 0.00

---

#### TC-005: Overbudget Scenario (Allocate More Than Available)
**Priority:** High  
**Preconditions:** 
- User is logged in
- Budget has limited available funds (e.g., To Budget = 100.00)

**Test Steps:**
1. Navigate to budget page
2. Note the "To Budget" amount (e.g., 100.00)
3. Click on "Budgeted" cell for a category
4. Enter amount greater than available: "500.00"
5. Press Enter

**Expected Results:**
- Amount is accepted (Actual allows overbudgeting)
- "To Budget" becomes negative (e.g., -400.00)
- Visual indicator shows overbudgeting (red or warning color)
- Category balance updates correctly
- User is warned they've allocated more than they have

**Test Data:**
- Available funds: 100.00
- Budgeted amount: 500.00
- Expected "To Budget": -400.00

---

#### TC-006: Update Existing Budget Allocation
**Priority:** Medium  
**Preconditions:** 
- Category has existing budget allocation (e.g., Food = 400.00)

**Test Steps:**
1. Navigate to budget page
2. Click on "Budgeted" cell for "Food" (currently 400.00)
3. Change amount to "600.00"
4. Press Enter

**Expected Results:**
- Budgeted amount updates to 600.00
- "To Budget" decreases by 200.00 (the difference)
- Balance updates correctly
- Previous transactions remain unchanged
- Envelope now has $600 allocated

**Test Data:**
- Original amount: 400.00
- New amount: 600.00
- Difference: 200.00

---

### Test Suite 3: Budget Calculations and Envelope Tracking

#### TC-007: Verify Budget Balance Calculation
**Priority:** High  
**Preconditions:** 
- Category has budgeted amount
- Category has spending transactions

**Test Steps:**
1. Navigate to budget page
2. Note the following for "Food" category:
   - Budgeted: 400.00
   - Spent: -170.15
3. Verify Balance calculation

**Expected Results:**
- Balance = Budgeted + Spent
- Balance for "Food" = 400.00 + (-170.15) = 229.85
- Balance shows remaining money in the envelope
- Balance displays in correct format (2 decimal places)
- Positive balance shows in black/default color
- Negative balance shows in red (overspent envelope)

**Test Data:**
- Budgeted: 400.00
- Spent: -170.15
- Expected Balance: 229.85

---

#### TC-008: Verify Overspending Indicator (Empty Envelope)
**Priority:** High  
**Preconditions:** 
- Category has spending exceeding budget (overspent envelope)

**Test Steps:**
1. Navigate to budget page
2. Locate category with negative balance (e.g., Entertainment: -31.32)
3. Verify visual indicators

**Expected Results:**
- Balance shows in red color
- Negative amount displays with minus sign
- Category is highlighted or marked as overspent
- Monthly summary shows "Overspent" amount
- User can see which envelopes are empty/overspent

**Test Data:**
- Category: "Entertainment"
- Budgeted: 100.00
- Spent: -131.32
- Balance: -31.32 (overspent by $31.32)

---

#### TC-009: Verify Monthly Budget Summary
**Priority:** High  
**Preconditions:** 
- Budget has multiple categories with allocations and spending

**Test Steps:**
1. Navigate to budget page for current month (May 2026)
2. Verify the summary section displays:
   - Available funds
   - Overspent in previous month
   - Budgeted (total)
   - For next month
   - To Budget

**Expected Results:**
- All summary values are calculated correctly
- "To Budget" = Income - Total Budgeted
- "Available funds" shows money ready to allocate
- "Overspent" shows previous month's negative balances
- "Budgeted" shows sum of all category budgets
- Values update in real-time when changes are made

**Test Data (from screenshot):**
- Available funds: 8,862.32
- Overspent in Apr: -1,044.46
- Budgeted: -3,787.86
- For next month: -4,030.00
- To Budget: 0.00

---

### Test Suite 4: Moving Money Between Envelopes

#### TC-010: Transfer Funds Between Categories
**Priority:** High  
**Preconditions:** 
- Two categories exist with budget allocations
- Source category has sufficient funds

**Test Steps:**
1. Navigate to budget page
2. Right-click or access menu for category "Food" (has 400.00 budgeted)
3. Select "Move money" or "Transfer" option
4. Select destination category "Restaurants"
5. Enter amount: "100.00"
6. Confirm transfer

**Expected Results:**
- "Food" budgeted amount decreases by 100.00 (now 300.00)
- "Restaurants" budgeted amount increases by 100.00
- "To Budget" amount remains unchanged (money moved between envelopes)
- Both category balances update correctly
- Total budgeted amount stays the same

**Test Data:**
- Source: "Food" (400.00)
- Destination: "Restaurants" (300.00)
- Transfer amount: 100.00

---

#### TC-011: Cover Overspending by Moving Money
**Priority:** High  
**Preconditions:** 
- One category is overspent (negative balance)
- Another category has available funds

**Test Steps:**
1. Navigate to budget page
2. Identify overspent category (e.g., Entertainment: -31.32)
3. Move money from another category (e.g., General: 897.06)
4. Transfer 50.00 to Entertainment
5. Verify overspending is covered

**Expected Results:**
- Entertainment balance increases by 50.00 (from -31.32 to 18.68)
- General balance decreases by 50.00
- Overspending is resolved
- Monthly summary "Overspent" amount updates

**Test Data:**
- Overspent category: Entertainment (-31.32)
- Source category: General (897.06)
- Transfer amount: 50.00

---

### Test Suite 5: Category Group Operations

#### TC-012: Collapse and Expand Category Group
**Priority:** Low  
**Preconditions:** 
- Category group exists with multiple categories

**Test Steps:**
1. Navigate to budget page
2. Locate "Usual Expenses" group (expanded)
3. Click collapse icon/arrow
4. Verify group is collapsed
5. Click expand icon/arrow
6. Verify group is expanded

**Expected Results:**
- When collapsed: Only group name and totals visible, categories hidden
- When expanded: All categories in group are visible
- Group totals remain visible in both states
- Collapse/expand state persists on page refresh
- Other groups are not affected

**Test Data:**
- Group: "Usual Expenses"
- Categories: Food, Restaurants, Entertainment, Clothing, General, Gift, Medical, Savings

---

#### TC-013: Verify Category Group Totals
**Priority:** Medium  
**Preconditions:** 
- Category group has multiple categories with budgets and spending

**Test Steps:**
1. Navigate to budget page
2. Locate "Usual Expenses" group
3. Verify group totals row
4. Manually calculate totals from individual categories
5. Compare with displayed totals

**Expected Results:**
- Group Budgeted = Sum of all category budgets in group
- Group Spent = Sum of all category spending in group
- Group Balance = Sum of all category balances in group
- Totals update automatically when individual categories change
- Calculations are accurate

**Test Data (from screenshot):**
- Group: "Usual Expenses"
- Expected Budgeted: 2,262.86
- Expected Spent: -1,649.51
- Expected Balance: 8,505.68

---

### Test Suite 6: Month Navigation and Budget Continuity

#### TC-014: Navigate to Different Budget Month
**Priority:** High  
**Preconditions:** 
- User is viewing current month budget (May 2026)

**Test Steps:**
1. Navigate to budget page (May 2026)
2. Click "Previous Month" arrow (<)
3. Verify April 2026 budget loads
4. Note any overspending from April
5. Click "Next Month" arrow (>) twice
6. Verify June 2026 budget loads

**Expected Results:**
- Month changes correctly
- Budget data for selected month displays
- Category allocations are month-specific
- Summary values are month-specific
- URL updates to reflect selected month (e.g., /budget?month=2026-06)
- Overspending from previous month is carried forward

**Test Data:**
- Current month: May 2026
- Previous month: April 2026
- Next month: June 2026

---

#### TC-015: Verify Budget Rollover to Next Month
**Priority:** High  
**Preconditions:** 
- Current month has categories with positive balances
- Current month has categories with negative balances (overspent)

**Test Steps:**
1. Navigate to budget page for current month (May 2026)
2. Note categories with positive balances (e.g., Food: 229.85)
3. Note categories with negative balances (e.g., Entertainment: -31.32)
4. Navigate to next month (June 2026)
5. Verify how balances carry forward

**Expected Results:**
- Positive balances roll over to next month (added to next month's budget)
- Negative balances (overspending) are shown in summary as "Overspent in [previous month]"
- User must cover overspending in new month
- Envelope budgeting principle maintained across months

**Test Data:**
- May balances: Food (+229.85), Entertainment (-31.32)
- June should show: Overspent in May: -31.32

---

## 5. Test Data Requirements

### Pre-existing Test Data (Demo Budget):
- Multiple accounts:
  - Bank of America: 9,110.53
  - Ally Savings: 702.48
  - Capital One Checking: 2,487.03
  - HSBC: 370.64
- Existing category groups:
  - Usual Expenses
  - Bills
- Existing categories with budgets:
  - Food: 400.00 budgeted, -170.15 spent
  - Restaurants: 300.00 budgeted, -247.70 spent
  - Entertainment: 100.00 budgeted, -131.32 spent (overspent)
- Historical transactions
- Budget allocations for current month

### Test Data to Create:
- New category: "Groceries Test"
- New category group: "Savings Goals"
- Budget allocations: Various amounts (100.00, 500.00, 600.00)
- Money transfers between categories

## 6. Entry and Exit Criteria

### Entry Criteria:
- ✅ Actual Budget application is running locally (http://localhost:3001)
- ✅ Demo budget file is loaded with test data
- ✅ Playwright is installed and configured
- ✅ Test environment is accessible
- ✅ Understanding of envelope budgeting methodology

### Exit Criteria:
- All test cases executed (15 test cases)
- Test results documented
- Critical bugs (if any) are logged
- Test coverage meets requirements (>80%)
- All envelope budgeting scenarios tested

## 7. Test Execution Strategy

### Execution Order:
1. **Suite 1:** Category Creation (TC-001, TC-002)
2. **Suite 2:** Budget Allocation (TC-003, TC-004, TC-005, TC-006)
3. **Suite 3:** Calculations (TC-007, TC-008, TC-009)
4. **Suite 4:** Money Transfer (TC-010, TC-011)
5. **Suite 5:** Group Operations (TC-012, TC-013)
6. **Suite 6:** Navigation & Rollover (TC-014, TC-015)

### Test Approach:
- Automated E2E tests using Playwright
- Page Object Model for maintainability
- Visual regression testing for UI elements
- Data-driven testing where applicable
- Follow existing test patterns in the project

### Test Automation Framework:
- Use existing Playwright configuration (`playwright.config.ts`)
- Follow existing page models pattern (`e2e/page-models/`)
- Use existing fixtures (`e2e/fixtures.ts`)
- Integrate with existing test suite

## 8. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Budget calculations incorrect | High | Verify calculations in multiple scenarios, cross-check with manual calculations |
| Data not persisting | High | Test save functionality explicitly, verify data after page refresh |
| UI elements not loading | Medium | Add proper wait conditions, use Playwright's auto-waiting |
| Test data conflicts | Medium | Use unique test data, cleanup after tests, use test isolation |
| Envelope budgeting logic complex | High | Study existing tests, understand envelope budgeting methodology |
| Month rollover edge cases | Medium | Test various scenarios (positive/negative balances) |

## 9. Test Deliverables

1. ✅ This test plan document (TEST_PLAN.md)
2. ⏳ Playwright test files (budget-categories.test.ts)
3. ⏳ Page object models (budget-page.ts, if not exists)
4. ⏳ Test execution report
5. ⏳ Screenshots/videos of test execution
6. ✅ AI interaction documentation (QE_ANALYSIS.md)
7. ⏳ AI conversation log (ai-interactions/)

## 10. Success Criteria

- ✅ All 15 test cases implemented in Playwright
- ✅ Test pass rate > 90%
- ✅ No critical bugs found
- ✅ Tests follow existing project patterns
- ✅ Tests are maintainable and use Page Object Model
- ✅ Documentation is complete and clear
- ✅ Envelope budgeting methodology is properly tested

## 11. References

- [Actual Budget Documentation](https://actualbudget.org/docs)
- [Envelope Budgeting Guide](https://actualbudget.org/docs/getting-started/envelope-budgeting)
- [Actual Budget GitHub](https://github.com/actualbudget/actual)
- [Playwright Documentation](https://playwright.dev/)
- Existing test files in `packages/desktop-client/e2e/`

---

**Document Version:** 1.0  
**Created:** May 20, 2026  
**Author:** Rucha (with AI assistance from Bob)  
**Status:** Ready for Implementation  
**Budgeting Methodology:** Envelope Budgeting