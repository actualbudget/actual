# Understanding Envelope Budgeting in Actual Budget

**Date:** May 20, 2026  
**Purpose:** Explain the envelope budgeting methodology for QE testing context

---

## What is Envelope Budgeting?

### Traditional Method (Physical Cash)
Historically, people would:
1. Cash their paycheck
2. Get physical envelopes labeled for different expenses (Groceries, Gas, Entertainment, etc.)
3. Divide cash into envelopes
4. Spend only from the designated envelope
5. When envelope is empty → stop spending OR move money from another envelope

### Digital Method (Actual Budget)
Actual Budget brings this to the digital age:
- **Categories = Virtual Envelopes**
- **Budget Allocation = Putting money in envelopes**
- **Spending = Taking money out of envelopes**
- **Balance = Money remaining in envelope**

---

## Key Principles

### 1. Zero-Sum Budgeting
**"Every dollar has a job"**

- All income must be allocated to categories
- "To Budget" should reach $0.00
- No money sits unassigned
- Forces intentional spending decisions

**Example from your screenshot:**
- Total income: Let's say $3,787.86
- All allocated to categories (Food, Restaurants, Entertainment, etc.)
- "To Budget: 0.00" = All money assigned

### 2. Total Allocation
Every unit of currency is assigned to a specific category:
- $1 for Netflix
- $1 for Savings
- $1 for Food
- Each dollar can only have ONE job

### 3. Goal-Oriented Planning
Assign funds with specific goals:
- Emergency savings
- Debt payoff
- Vacation fund
- Retirement

### 4. Flexibility
You can move money between envelopes as priorities change:
- Overspent on Entertainment? Move money from Dining Out
- Need more for Groceries? Take from Clothing
- **Important:** Total budgeted amount stays the same

---

## How It Works in Your Screenshot

### Category: Food
```
Budgeted: $400.00    ← Money put in envelope
Spent:    -$170.15   ← Money taken out
Balance:  $229.85    ← Money still in envelope
```

**Interpretation:**
- You allocated $400 to Food envelope
- You've spent $170.15 on groceries
- You have $229.85 left to spend on food this month

### Category: Entertainment (Overspent)
```
Budgeted: $100.00
Spent:    -$131.32   ← Spent MORE than budgeted!
Balance:  -$31.32    ← Negative = overspent
```

**Interpretation:**
- You allocated $100 to Entertainment
- You spent $131.32 (went over by $31.32)
- Envelope is empty + you "borrowed" $31.32
- **Action needed:** Cover this by moving money from another category

### Monthly Summary
```
Available funds:  $8,862.32  ← Money ready to allocate
Overspent in Apr: -$1,044.46 ← Last month's overspending
Budgeted:         -$3,787.86 ← Total allocated this month
For next month:   -$4,030.00 ← Money set aside for next month
To Budget:        $0.00      ← All money assigned (zero-sum)
```

---

## Real-World Scenarios

### Scenario 1: Normal Spending
**Situation:** You want to buy groceries for $50

**Check:**
- Food envelope has $229.85
- $50 < $229.85 ✅
- **Action:** Buy groceries, balance becomes $179.85

### Scenario 2: Overspending
**Situation:** You want to go to a concert for $150

**Check:**
- Entertainment envelope has -$31.32 (already overspent!)
- **Options:**
  1. Don't go to concert
  2. Move $181.32 from another envelope (to cover -$31.32 + $150)
  3. Wait until next month

### Scenario 3: Moving Money Between Envelopes
**Situation:** Entertainment is overspent by $31.32

**Solution:**
1. Find envelope with extra money (e.g., General: $897.06)
2. Move $50 from General to Entertainment
3. Entertainment: -$31.32 + $50 = $18.68 (positive again!)
4. General: $897.06 - $50 = $847.06

**Important:** "To Budget" stays at $0.00 (money just moved between envelopes)

---

## Monthly Cycle

### Beginning of Month
1. **Receive income** (e.g., $3,000 paycheck)
2. **"To Budget" shows $3,000** (unallocated money)
3. **Allocate to categories** until "To Budget" = $0.00
4. **Track spending** throughout the month

### During Month
- Spend from envelopes
- Track transactions
- Move money between envelopes as needed
- Adjust allocations if priorities change

### End of Month
- **Positive balances** → Roll over to next month (added to next month's budget)
- **Negative balances** → Must be covered in next month
- **Learn and adjust** → Increase/decrease category budgets based on actual spending

---

## Advantages Over Traditional Budgeting

### Traditional Budgeting:
❌ "Do I have money in my bank account?" → Yes → Spend it  
❌ Might forget about upcoming bills  
❌ Surprises at end of month  

### Envelope Budgeting:
✅ "Do I have money in THIS envelope?" → Check specific category  
✅ Every expense is planned for  
✅ No surprises  
✅ Visual awareness of spending limits  
✅ Prevents overspending  
✅ Flexible (can move money)  
✅ Intentional spending  

---

## Key Differences from Traditional Cash Envelopes

### Actual Budget Improvements:
1. **Includes Fixed Expenses**
   - Traditional: Often overlooks rent, utilities, mortgage
   - Actual: Every expense (fixed or variable) is tracked

2. **Digital Tracking**
   - No need for physical cash
   - Works with debit/credit cards
   - Automatic transaction import
   - Detailed history and reports

3. **Flexibility**
   - Easy to move money between categories
   - Can adjust on the fly
   - No need to physically move cash

4. **Awareness**
   - See exactly where every dollar goes
   - Historical data for better planning
   - Visual indicators for overspending

---

## What We're Testing (E2E Test Scenarios)

### 1. Creating Envelopes (Categories)
- Can user create new category "Groceries Test"?
- Does it appear in the correct group?
- Does it start with $0.00 balance?

### 2. Filling Envelopes (Budget Allocation)
- Can user allocate $500 to Food category?
- Does "To Budget" decrease by $500?
- Does category balance increase by $500?

### 3. Zero-Sum Budgeting
- Can user allocate all available funds?
- Does "To Budget" reach $0.00?
- What happens if user tries to allocate more than available?

### 4. Tracking Spending
- Does balance update when transactions are added?
- Is calculation correct: Balance = Budgeted + Spent?
- Does overspending show in red?

### 5. Moving Money Between Envelopes
- Can user transfer $100 from Food to Entertainment?
- Do both balances update correctly?
- Does "To Budget" remain unchanged?

### 6. Overspending Scenarios
- What happens when spending exceeds budget?
- Is negative balance displayed correctly?
- Is it highlighted/marked as overspent?

### 7. Monthly Rollover
- Do positive balances carry to next month?
- Is overspending tracked in next month's summary?
- Can user see "Overspent in [previous month]"?

### 8. Category Groups
- Can user create/manage category groups?
- Do group totals calculate correctly?
- Can groups be collapsed/expanded?

---

## Example: Week-by-Week Budget Tracking

### Week 1
```
Food:     $300 budgeted → $123 spent → $177 remaining
Gas:      $100 budgeted → $40 spent  → $60 remaining
Gifts:    $50 budgeted  → $45 spent  → $5 remaining
```

### Week 2 - Unexpected Expense
```
Gifts: $5 remaining, but need $10 for housewarming gift
Solution: Move $5 from Dining Out to Gifts
Result: Gifts = $10, can buy gift!
```

### Week 3 - Overspending
```
Personal Care: $35 budgeted → $38 spent → -$3 (overspent!)
Solution: Won $37 lottery
  - $3 to cover Personal Care deficit
  - $24 to Groceries (running low)
  - $10 to Savings
```

This demonstrates the **Flexibility** and **Total Allocation** principles!

---

## Summary for Testing

**Envelope Budgeting in Actual Budget means:**

1. **Every dollar is assigned** to a category (envelope)
2. **Spending is tracked** against each category
3. **Balances show** how much is left in each envelope
4. **Money can be moved** between envelopes as needed
5. **Overspending is visible** and must be covered
6. **Monthly cycles** with rollover of balances
7. **Zero-sum approach** ensures all money has a purpose

**Our E2E tests will verify** that all these principles work correctly in the application!

---

## References
- [Actual Budget Envelope Budgeting Guide](https://actualbudget.org/docs/getting-started/envelope-budgeting)
- [Zero-Sum Budgeting Explanation](https://actualbudget.org/docs/getting-started/envelope-budgeting#zero-sum-budgeting)
- Traditional envelope budgeting methodology

---

**Understanding Level:** ✅ Complete  
**Ready for Test Implementation:** ✅ Yes  
**Next Step:** Implement Playwright E2E tests