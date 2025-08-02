# Hierarchical Categories Technical Proposal

## TL;DR - Mixed Categories Approach 🎯

**Categories can be both organizational AND functional.** Parent categories can have their own budgets and transactions while also organizing subcategories underneath.

**👉 [See User Guide](subcategory-budgeting-user-guide.md) for non-technical overview**

## Technical Approach

| Category Usage | Implementation | Display Logic |
|----------------|----------------|---------------|
| **Pure Organizational** | Parent organizes children only | UI shows sum of children |
| **Mixed Usage** | Both organizes AND handles money | UI shows direct + children totals |

### Core Examples

**Mixed Usage (Recommended):**
```
🍽️ Food                    $50 budgeted (misc food)
  ├── 🛒 Groceries          $400 budgeted  
  └── 🍕 Restaurants        $200 budgeted
Total: $650 budgeted
```

## Key Benefits

- **Zero artificial constraints** on budgeting/spending placement
- **Real-world flexibility** for misc expenses in parent categories  
- **100% backward compatible** with existing workflows
- **Supports Sankey diagrams** and hierarchical reporting

## Relationship to Existing Systems

### vs Category Groups
| Feature | Category Groups | Hierarchical Categories |
|---------|----------------|------------------------|
| **Nesting** | 2 levels only | Unlimited levels |
| **Parent Budgeting** | ❌ Cannot have budgets | ✅ Can have budgets |
| **Flexibility** | Fixed structure | Any category can become parent |

Since a parent category can act as a category group, there is potential to replace category groups later.

### vs Tags
- **Tags**: Best for cross-category analysis ("How much on #kids?")
- **Hierarchical Categories**: Best for structured budgeting with clean rollups
- **Complementary**: Use hierarchical structure for budgeting, tags for analysis

## Implementation Approach

### Data Model
- Add `parent_id` field to categories table
- Categories work exactly like today, just with optional parent relationship
- UI-only rollup calculations keep backend simple

### Key Edge Cases Handled
- **Mixed budgeting:** Parent + children both have budgets (shows direct + total)
- **Budget/transaction mismatch:** Clear UI guidance when budgets and transactions don't align
- **Circular references:** Validation prevents category becoming its own ancestor
- **Moving categories:** Preserve all history, update rollup displays only

## Critical Implementation Details

### Mixed Usage Scenarios

**Scenario 1: Pure Organizational Parent**
```typescript
🍽️ Food                    $0 budgeted, $0 spent (purely organizational)
  ├── 🛒 Groceries          $400 budgeted, $350 spent
  ├── 🍕 Restaurants        $200 budgeted, $150 spent
  └── ☕ Coffee             $100 budgeted, $80 spent

// Rollup Display:
Food (total): $700 budgeted, $580 spent
// Individual reports show: Groceries $350, Restaurants $150, Coffee $80
```

**Scenario 2: Mixed Usage Parent**
```typescript
🍽️ Food                    $50 budgeted, $25 spent (misc food items)
  ├── 🛒 Groceries          $400 budgeted, $350 spent
  ├── 🍕 Restaurants        $200 budgeted, $150 spent
  └── ☕ Coffee             $100 budgeted, $80 spent

// Rollup Display:
Food (total): $750 budgeted, $605 spent
Food (direct): $50 budgeted, $25 spent
└── Children: $700 budgeted, $580 spent
```

**Scenario 2: Mixed Parent (Organizational + Functional)**
```typescript
🍽️ Food                    $50 budgeted, $25 spent (misc food items)
  ├── 🛒 Groceries          $400 budgeted, $350 spent
  ├── 🍕 Restaurants        $200 budgeted, $150 spent
  └── ☕ Coffee             $100 budgeted, $80 spent

// Rollup Display:
Food (total): $750 budgeted, $605 spent
Food (direct): $50 budgeted, $25 spent
└── Children: $700 budgeted, $580 spent

// User sees both their "misc food" spending AND organized subcategories
```

**Scenario 3: Deep Nesting with Mixed Usage**
```typescript
🍽️ Food                    $50 budgeted, $25 spent (misc food)
  ├── 🍽️ Meals             $20 budgeted, $15 spent (misc meal costs)
  │   ├── 🛒 Groceries      $400 budgeted, $350 spent
  │   └── 🍳 Meal Prep      $100 budgeted, $90 spent
  ├── 🍕 Dining Out         $30 budgeted, $20 spent (misc dining)
  │   ├── 🍕 Restaurants    $200 budgeted, $150 spent
  │   └── 🚚 Food Delivery  $80 budgeted, $70 spent
  └── ☕ Coffee             $100 budgeted, $80 spent

// Rollup Calculations:
Food (total): $1080 budgeted, $800 spent
├── Food (direct): $50 budgeted, $25 spent
├── Meals (total): $520 budgeted, $455 spent
│   ├── Meals (direct): $20 budgeted, $15 spent  
│   └── Meals children: $500 budgeted, $440 spent
├── Dining Out (total): $310 budgeted, $240 spent
│   ├── Dining Out (direct): $30 budgeted, $20 spent
│   └── Dining Out children: $280 budgeted, $220 spent
└── Coffee: $100 budgeted, $80 spent
```

### Critical Edge Cases & Solutions

**Edge Case 1: User Confusion - "Where did my money go?"**
```typescript
// Problem: User budgets $500 for Food but sees $750 total
// Solution: Clear UI indication

🍽️ Food                    
├── 📊 Your direct budget: $50 budgeted, $25 spent
├── 📊 Children budget: $700 budgeted, $580 spent  
├── ═══════════════════════════════════════════════
└── 📊 Total Food: $750 budgeted, $605 spent

// Clear visual separation between direct and rollup amounts
```

**Edge Case 2: Reports - Which Level to Show?**
```typescript
// Problem: Category reports could be confusing with nested data
// Solution: Multiple report views

// Flat View (current behavior):
Groceries: $350, Restaurants: $150, Coffee: $80, Food: $25, Meals: $15

// Hierarchical View:
Food: $605
├── Groceries: $350
├── Restaurants: $150  
├── Coffee: $80
├── Food (direct): $25
└── Meals (direct): $15
```

**Edge Case 3: Moving Categories - Preserving Budget/Transaction History**
```typescript
// Problem: User moves "Groceries" from under "Food" to under "Household"
// Solution: Preserve all data, update UI displays

// Before move:
Food (total): $750, Groceries: $400 (contributes to Food total)

// After move:
Food (total): $350 (no longer includes Groceries)
Household (total): $800 (now includes Groceries $400)
Groceries: $400 (unchanged - keeps all history)

// All historical data preserved, only rollup calculations change
```

**Edge Case 4: Template/Goal Inheritance**
```typescript
// Question: Do child categories inherit parent templates/goals?
// Solution: No inheritance (simplest) - each category manages its own templates/goals independently
```

## The Bottom Line

This approach gives you **maximum flexibility with zero artificial constraints**. You get:
- ✅ Complete freedom to budget and spend at any level
- ✅ Familiar experience - categories work exactly like they do today
- ✅ All existing features work unchanged
- ✅ Real-world flexibility for how people actually manage money
- ✅ Ability to start simple and grow more detailed over time

**It's the most natural and flexible approach - categories can be whatever you need them to be!** 🚀

## 🔮 Future Enhancement: Auto-Split Budgets

**Potential Future Feature:** An auto-split option could make detailed budgeting even easier:

```
You enter: Food = $600
System offers: "Split evenly among subcategories? ($200 each)"
Result: Detailed budgets with zero manual math! 🎉
```

**Potential split methods:**
- **Even split:** Divide equally among children
- **Smart split:** Based on spending history  
- **Custom split:** Set your own percentages

This would bridge the gap between simple and detailed budgeting for users who want granular control without manual calculations.

---