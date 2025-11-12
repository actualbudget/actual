# View-Scoped Category Arrangement Implementation Guide

## Overview

This architecture enables each Budget View to have its own category ordering while keeping the global category order unchanged. When users view a specific Budget View and rearrange categories, those changes persist only for that view.

## Architecture

### Data Storage

**New preference**: `budget.viewCategoryOrder`
- **Type**: `Record<viewId: string, categoryIds: string[]>`
- **Storage**: Synced across devices (like other budget prefs)
- **Example**:
  ```json
  {
    "bills-view-123": ["cat-expenses", "cat-utilities", "cat-groceries"],
    "savings-view-456": ["cat-401k", "cat-emergency", "cat-vacation"]
  }
  ```

### Hook API

**`useBudgetViews()`** - Enhanced with:
- `viewCategoryOrder: ViewCategoryOrder` - Current view orders
- `setViewCategoryOrder(viewId: string, categoryIds: string[])` - Update order for a view

**`useCategoryOrder(categories, viewId, viewCategoryOrder)`** - Selector utility:
- Returns the effective category order based on context
- If `viewId` has custom order: returns that
- Otherwise: returns global order (by sort_order from DB)

**`sortCategoriesByOrder(categories, order)`** - Sorting helper:
- Sorts categories by the provided order array
- Unmapped categories appended at end

## Implementation Steps

### Step 1: Display Category Order Based on Context

In your budget table/view component, use the category order selector:

```typescript
import { useCategoryOrder, sortCategoriesByOrder } from './hooks/useCategoryOrder';
import { useBudgetViews } from './hooks/useBudgetViews';

function BudgetView({ viewId }) {
  const { viewCategoryOrder } = useBudgetViews();
  const allCategories = useCategories(); // your existing hook
  
  // Get the effective order (view-specific or global)
  const categoryOrder = useCategoryOrder(
    allCategories,
    viewId, // null/undefined to use global order
    viewCategoryOrder
  );
  
  // Sort categories using that order
  const sortedCategories = sortCategoriesByOrder(allCategories, categoryOrder);
  
  // Render sorted categories...
}
```

### Step 2: Handle Category Drag-and-Drop Reordering

When a user drags a category to reorder it:

```typescript
const { setViewCategoryOrder } = useBudgetViews();

function handleCategoryReorder(newOrder: string[], viewId: string) {
  if (viewId) {
    // In a view context: save view-specific order
    setViewCategoryOrder(viewId, newOrder);
  } else {
    // In global context: update global sort_order in DB
    // (existing behavior - call your DB update handler)
    updateGlobalCategoryOrder(newOrder);
  }
}
```

### Step 3: Initialize View-Specific Order

When a user first applies a budget view or edits it, initialize the order if not present:

```typescript
// Option A: Auto-initialize on first view
if (!viewCategoryOrder[viewId]) {
  // Copy global order as initial order for this view
  setViewCategoryOrder(viewId, globalCategoryOrder);
}

// Option B: Explicitly initialize in view creation
const newView = { id: viewId, name: 'Bills' };
setViewCategoryOrder(viewId, categories.map(c => c.id));
```

### Step 4: Cleanup on View Deletion

Already handled in `useBudgetViews.removeView()` — it removes the view from `viewCategoryOrder`.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Store in prefs** (not DB) | Syncs across devices, like other view settings; lightweight JSON |
| **Store per viewId** (not view name) | Stable even if view is renamed |
| **Keep global sort_order** | Preserves existing DB behavior; no migration needed |
| **Lazy initialization** | View order only created when needed; doesn't bloat storage |
| **Return global by default** | Graceful fallback if view order missing (forward-compatible) |

## Migration & Backwards Compatibility

✅ **Fully backwards compatible**
- Existing code using global category order continues to work
- Old views without `viewCategoryOrder` entries fall back to global order
- No database schema changes required
- No data migration needed

## Usage Examples

### Scenario 1: Global View (No Budget View Applied)

```typescript
const categoryOrder = useCategoryOrder(categories, null, viewCategoryOrder);
// ↓ Uses global order (categories sorted by DB sort_order)
```

### Scenario 2: Bills Budget View

```typescript
const categoryOrder = useCategoryOrder(
  categories,
  'bills-view-id',
  viewCategoryOrder
);
// ↓ If 'bills-view-id' has custom order, uses that
// ↓ Otherwise, falls back to global order
```

### Scenario 3: User Reorders in Bills View

```typescript
// Drag "Utilities" to top
const newOrder = ['utilities-cat-id', 'rent-cat-id', 'groceries-cat-id'];
setViewCategoryOrder('bills-view-id', newOrder);

// Prefs updated:
// 'budget.viewCategoryOrder' = {
//   'bills-view-id': ['utilities-cat-id', 'rent-cat-id', 'groceries-cat-id']
// }

// Switch to global view → sees original global order
// Switch back to Bills → sees custom order at top
```

## Testing Recommendations

1. **Unit Tests**:
   - `useCategoryOrder()` with and without viewId
   - `sortCategoriesByOrder()` with partial/full category lists
   - View removal cleans up order

2. **Integration Tests**:
   - Reorder in view → verify pref saved
   - Switch views → verify correct order applied
   - Rename view → verify order persists
   - Delete view → verify order cleaned up

3. **E2E Tests**:
   - User drag-reorders categories in Bills view
   - Switches to global view (categories in original order)
   - Returns to Bills view (custom order preserved)
   - Syncs to another device (custom order synced)

## Future Enhancements

- **Copy order**: "Copy Bills view order to Groceries view"
- **Reset order**: "Reset view to global order"
- **Order templates**: Pre-built category orders for common scenarios
- **Smart ordering**: AI suggestions based on spending patterns

---

**Files Changed**:
- `packages/loot-core/src/types/prefs.ts` — Added `budget.viewCategoryOrder` pref type
- `packages/desktop-client/src/hooks/useBudgetViews.ts` — Added `viewCategoryOrder` state and `setViewCategoryOrder()`
- `packages/desktop-client/src/hooks/useCategoryOrder.ts` — New utility hooks for selecting and sorting category orders
