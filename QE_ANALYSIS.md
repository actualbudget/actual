# QE Exercise Analysis - Actual Budget

## What's Already Tested (Existing E2E Tests)

Based on my analysis of `packages/desktop-client/e2e/`, the following features have comprehensive test coverage:

### ✅ Well-Covered Features:
1. **Accounts Management**
   - Creating accounts
   - Closing accounts
   - Importing transactions from CSV
   - Account balances

2. **Transactions**
   - Creating basic transactions
   - Split transactions
   - Transfer transactions
   - Transaction filtering by category

3. **Payees**
   - Payee management
   - Payee search
   - Payee rules

4. **Rules**
   - Creating rules
   - Rule application to transactions
   - Split transaction rules

5. **Onboarding**
   - Initial setup flow
   - Budget import (YNAB4, YNAB5)

6. **Settings**
   - Basic settings pages

7. **Bank Sync**
   - Bank sync page visuals
   - Account search

8. **Schedules**
   - Schedule management (basic coverage)

## What's Missing or Lightly Covered

### 🎯 Recommended Features to Test:

### **Feature 1: Budget Category Management & Allocation** ⭐ RECOMMENDED
**Why this feature:**
- Core functionality of the app (visible in your screenshot)
- Complex business logic (budget calculations, rollover, overspending)
- Limited existing test coverage
- Real-world user workflow

**What I see in your screenshot:**
- Budget categories (Food, Restaurants, Entertainment, etc.)
- Budget allocation (Budgeted column: 3,787.86)
- Spending tracking (Spent column: -3,039.51)
- Balance calculations (Balance column: 8,640.68)
- Category groups (Usual Expenses, Bills)
- Monthly budget summary (Available funds, Overspent, etc.)

**Test scenarios:**
1. Create new budget categories
2. Allocate funds to categories
3. Verify budget calculations
4. Test overspending scenarios
5. Test budget rollover to next month
6. Move money between categories
7. Category group management

### **Feature 2: Reports & Analytics** ⭐ RECOMMENDED
**Why this feature:**
- Visible in sidebar (Reports menu)
- Data visualization and calculations
- No existing E2E tests found
- Important for financial insights

**Test scenarios:**
1. Net Worth report generation
2. Cash Flow report with date ranges
3. Spending by category report
4. Report filtering and date selection
5. Report data accuracy

## Recommendation for QE Exercise

**I recommend testing Feature 1: Budget Category Management**

**Reasons:**
1. ✅ Core feature - central to the app's purpose
2. ✅ Complex logic - demonstrates testing skills
3. ✅ Minimal existing coverage - adds value
4. ✅ Clear user workflows - easy to document
5. ✅ Visible in UI - can verify visually
6. ✅ Multiple test scenarios - comprehensive test plan

**Alternative:** If you want to test 2 features, add Reports as the second feature.

## Next Steps

1. Create detailed test plan for Budget Category Management
2. Document AI interactions (this file is part of it!)
3. Implement Playwright tests following existing patterns
4. Submit on branch: `qe-exercise-submission`