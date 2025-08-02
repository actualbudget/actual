# Hierarchical Categories Implementation Specification

**Status:** Draft Implementation Plan  
**Author:** johnn27 (community contributor)  
**Based on:** Issue #1320 (206+ upvotes), PR #5268, PocketSmith competitive analysis  
**References:** 
- [Mixed Categories Approach](mixed-categories-approach.md) - Detailed technical proposal
- [Competitive Research](competitive-research.md) - PocketSmith analysis & market validation
- [Risk Analysis](risk-analysis.md) - Expert sub-agent reviews & risk mitigation strategies
- [User Guide](user-guide.md) - Non-technical overview for end users

## Executive Summary

Implement hierarchical categories in Actual Budget using a **3-phase incremental approach** validated by PocketSmith's successful implementation and strong market demand. This addresses Issue #1320's 206+ user requests and provides competitive advantage over YNAB (2-level only) and Credit Karma (no hierarchy).

**Core Philosophy:** Parent categories as "containers" for organization, child categories for actual budgeting, with roll-up analytics for insights.

**⚠️ Risk Consideration:** Expert sub-agent reviews identified significant risks around system complexity, user confusion, and competing organizational paradigms (Category Groups vs Hierarchical Categories vs Tags). Implementation includes enhanced safeguards and risk mitigation strategies. See [Risk Analysis](risk-analysis.md) for detailed expert perspectives and mitigation approaches.

---

## Phase 1: Visual Hierarchy Foundation 🎯
**Goal:** Deliver basic hierarchical organization with minimal risk  
**Timeline:** 2-3 weeks  
**Risk Level:** LOW (UI-only changes)

### Features Delivered
- ✅ **Unlimited Category Nesting**: Categories can have `parent_id` relationships
- ✅ **Visual Hierarchy Display**: Indented category lists showing parent-child relationships  
- ✅ **Roll-up Calculations**: Parent categories show totals of children (display only)
- ✅ **Backward Compatibility**: All existing functionality preserved

### Technical Implementation
```typescript
// Database Schema (already in PR #5268)
ALTER TABLE categories ADD COLUMN parent_id TEXT REFERENCES categories(id);

// Client-side hierarchy building (existing)
BuildCategoryHierarchy.ts // Already implemented

// New: Roll-up calculation display
function calculateCategoryRollup(category: CategoryWithChildren) {
  const childTotals = category.children.reduce((sum, child) => ({
    budget: sum.budget + (child.budget || 0),
    spent: sum.spent + (child.spent || 0)
  }), { budget: 0, spent: 0 });
  
  return {
    directAmounts: { budget: category.budget, spent: category.spent },
    rollupAmounts: childTotals,
    totalAmounts: {
      budget: (category.budget || 0) + childTotalss.budget,
      spent: (category.spent || 0) + childTotals.spent
    }
  };
}
```

### UI Enhancements
- **Indented category display** with depth indicators
- **Rollup information** showing "Direct: $X, Total: $Y" for parent categories
- **Visual hierarchy cues** (icons, styling) to indicate parent-child relationships
- **Collapse/expand toggles** for parent categories (optional)

### Success Criteria
- [ ] Categories can be assigned parent relationships via UI
- [ ] Category lists display visual hierarchy with proper indentation
- [ ] Parent categories show rolled-up totals from children
- [ ] All existing budget/transaction functionality works unchanged
- [ ] Mobile interface handles hierarchy display appropriately

---

## Phase 2: Enhanced Creation & Management UX 🚀
**Goal:** Make hierarchy creation intuitive and powerful  
**Timeline:** 2-3 weeks  
**Risk Level:** MEDIUM (new UX patterns)

### Features Delivered (Based on PocketSmith Success Patterns)
- 🎯 **Three Creation Methods**: Hyphen notation, drag-drop, settings dropdown
- 🎯 **Intuitive Category Management**: Easy conversion, reordering, restructuring
- 🎯 **Smart Transaction Categorization**: Hierarchical category picker
- 🎯 **Visual Polish**: Professional hierarchy display with clear affordances

### Creation Methods Implementation
```typescript
// Method 1: Hyphen Notation (Power Users)
"food-groceries-organic" → Creates: Food > Groceries > Organic

// Method 2: Drag & Drop (Visual Users)  
<DragHandle category={groceries} onDrop={food} />

// Method 3: Settings Dropdown (Traditional Users)
<CategorySettings>
  <ParentCategorySelect value={parentId} onChange={setParent} />
</CategorySettings>
```

### Transaction Categorization Enhancement
```typescript
// Hierarchical Category Picker
function HierarchicalCategoryPicker() {
  return (
    <CategoryPicker>
      <SearchInput placeholder="Type category name..." />
      <CategoryTree>
        <CategoryGroup name="🍽️ Food">
          <Category name="🛒 Groceries" />
          <Category name="🍕 Restaurants" />
        </CategoryGroup>
      </CategoryTree>
      <CreateCategoryOption />
    </CategoryPicker>
  );
}
```

### Management UX Features
- **Convert Existing Categories**: Add children to current categories seamlessly
- **Drag & Drop Reordering**: Visual hierarchy manipulation
- **Bulk Operations**: Move multiple categories between parents
- **Validation**: Prevent circular references, warn about complex changes

### Success Criteria
- [ ] Users can create hierarchies using all three methods
- [ ] Existing categories can be easily converted to have children
- [ ] Transaction categorization supports hierarchical selection
- [ ] Category management feels intuitive and responsive
- [ ] Help documentation explains best practices clearly

---

## Phase 3: Advanced Analytics & Budgeting 📊
**Goal:** Leverage hierarchy for insights and advanced budgeting workflows  
**Timeline:** 3-4 weeks  
**Risk Level:** MEDIUM-HIGH (budget logic changes)

### Features Delivered
- 📈 **Hierarchical Reporting**: Roll-up analytics with drill-down capabilities
- 🎯 **Advanced Budgeting Options**: Container budgeting, allocation helpers  
- 📋 **Template & Goal Integration**: Hierarchy-aware templates and goals
- 🔍 **Enhanced Search & Filtering**: Find categories across hierarchy levels

### Advanced Budgeting Features
```typescript
// Container Budgeting (Optional Advanced Feature)
interface ContainerBudgetOptions {
  allowParentBudgets: boolean;     // Default: false (containers only)
  budgetAllocation: 'manual' | 'even-split' | 'history-based';
  overspendingStrategy: 'warn' | 'allow' | 'redistribute';
}

// Budget Allocation Helper
function BudgetAllocationHelper({ parentCategory, children }) {
  const totalBudget = 600;
  const suggestions = {
    evenSplit: totalBudget / children.length,
    historyBased: calculateHistoricalSplit(children),
    custom: getUserCustomSplit()
  };
  
  return <AllocationUI suggestions={suggestions} />;
}
```

### Reporting Enhancements
- **Hierarchical Spending Reports**: Show breakdown by category levels
- **Roll-up Budget Analysis**: Compare parent-level budgets vs actuals
- **Drill-down Capabilities**: Start high-level, drill to specific categories
- **Cross-hierarchy Insights**: Find patterns across different category trees

### Advanced Management
- **Template Inheritance**: Apply budgeting templates across hierarchy levels
- **Goal Cascading**: Set parent goals that influence child category targets  
- **Bulk Budget Operations**: Update multiple related categories simultaneously
- **Performance Optimization**: Handle large hierarchies efficiently

### Success Criteria
- [ ] Reporting leverages hierarchy for better insights
- [ ] Budget allocation helpers reduce manual work
- [ ] Templates and goals work seamlessly with hierarchies
- [ ] Performance remains good with complex category structures
- [ ] Advanced features feel natural, not overwhelming

---

## Implementation Guidelines

### Development Approach
- **Incremental Rollout**: Each phase delivers independent value
- **Community Feedback**: Validate each phase before proceeding  
- **Backward Compatibility**: Preserve existing workflows throughout
- **Performance First**: Optimize for typical usage patterns

### Code Quality Standards
- **TypeScript Strict Mode**: All new code uses strict typing
- **Test Coverage**: Unit tests for hierarchy logic, E2E for user flows
- **Documentation**: Clear inline docs and user-facing help
- **Accessibility**: Hierarchy displays work with screen readers

### Risk Mitigation (Based on Expert Sub-Agent Reviews)
- **Feature Flags**: Allow gradual rollout and quick rollback
- **Data Migration**: Safe conversion of existing category structures  
- **User Education**: Help content and onboarding for new features
- **Performance Monitoring**: Track app performance with hierarchies
- **Competing Systems Guidance**: Clear documentation on when to use Groups vs Hierarchy vs Tags
- **Progressive Disclosure**: Advanced features hidden by default to preserve simplicity
- **Alternative Solution Readiness**: Ability to pivot to category group enhancement if hierarchy proves too complex

---

## Market Positioning

### Competitive Advantages
- **vs YNAB**: Unlimited nesting (they have 2-level only)
- **vs Credit Karma**: Full hierarchy (they have none)
- **vs PocketSmith**: Open source with same feature set
- **vs Mint Refugees**: Modern alternative with expected features

### Success Metrics
- **User Adoption**: % of users creating hierarchical categories
- **Depth Usage**: Average hierarchy depth, most common patterns
- **Performance**: App speed with complex category structures
- **Community Feedback**: GitHub reactions, Discord discussions, user surveys

---

## References & Background

### Research Foundation
- **[Hierarchical Categories Research](hierarchical-categories-research.md)**: Comprehensive competitive analysis and user demand validation
- **[Mixed Categories Technical Proposal](subcategory-budgeting-decision.md)**: Detailed implementation approach and edge case handling
- **Issue #1320**: 206+ user upvotes demonstrating strong demand
- **PR #5268**: Existing foundation work for hierarchical structure

### Key Insights from Research
- **Strong Market Demand**: Users actively requesting this across multiple platforms
- **Competitor Gaps**: Popular apps (YNAB, Credit Karma) lack this functionality  
- **Proven Patterns**: PocketSmith demonstrates successful implementation approach
- **User Patterns**: Real-world usage validates our proposed hierarchy structures

### Implementation Validation
- **PocketSmith Analysis**: Container-based budgeting approach proven successful
- **Discord Feedback**: Community preferences align with phased approach
- **Technical Foundation**: Existing PR #5268 provides solid starting point
- **Open Source Strategy**: Incremental phases enable community contribution

---

## Next Steps

1. **Review & Approval**: Community feedback on this specification
2. **Phase 1 Implementation**: Begin with visual hierarchy foundation
3. **User Testing**: Validate approach with real users after Phase 1
4. **Iterate**: Adjust subsequent phases based on feedback
5. **Community Contribution**: Enable other developers to contribute to later phases

This specification provides a clear roadmap for delivering hierarchical categories that address real user needs while maintaining Actual Budget's commitment to simplicity and reliability.