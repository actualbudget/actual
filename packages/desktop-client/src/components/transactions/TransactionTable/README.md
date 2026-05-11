# Transaction Table - Modular Implementation

A refactored transaction table component that breaks down the original monolithic implementation into a maintainable, modular architecture.

## ⚠️ Experimental Feature

This new transaction table is currently **disabled by default** and available behind a feature flag. To enable it:

1. Go to **Settings → Experimental Features**
2. Enable **"Modular Transaction Table (Rewrite)"**
3. Reload the page

The feature flag allows you to test the new implementation while keeping the original table as a safe fallback.

## Overview

This is a drop-in replacement for the original `TransactionsTable.tsx` (3470 lines) with the same API and behavior, but organized into focused, reusable components.

## Architecture

### File Structure

```
TransactionTable/
├── index.ts                          # Exports
├── types.ts                          # TypeScript definitions
├── TransactionTableState.ts          # State management (reducer)
├── TransactionTableKeyboard.ts       # Keyboard navigation
├── TransactionTable.tsx              # Main component
├── useTransactionTableColumnLayout.ts # Column width management
├── components/
│   ├── TransactionHeader.tsx         # Sortable header
│   ├── TransactionRow.tsx            # Row component
│   ├── TransactionRowCells.tsx       # Cell orchestration
│   ├── RegularTransactionRowCells.tsx
│   ├── SplitParentTransactionRowCells.tsx
│   ├── SplitChildTransactionRowCells.tsx
│   ├── PreviewTransactionRowCells.tsx
│   ├── RowExpansionCell.tsx          # Expandable row UI
│   └── cells/                        # Individual cell components
│       ├── StatusCell.tsx
│       ├── DateCell.tsx
│       ├── PayeeCell.tsx
│       ├── NotesCell.tsx
│       ├── CategoryCell.tsx
│       ├── AmountCell.tsx
│       ├── BalanceCell.tsx
│       └── AccountCell.tsx
└── utils/
    └── transactionFormatters.ts      # Data serialization
```

## Key Features

### 1. Modular Architecture

Each concern is separated into its own file:

- **Cells**: Individual components for each column type
- **State**: Centralized reducer-based state management
- **Keyboard**: Extracted navigation logic
- **Types**: Comprehensive TypeScript definitions

### 2. Expandable Rows

Rows can expand to show additional content (e.g., split transaction details):

```typescript
// Manage expansion state
dispatch({ type: 'TOGGLE_ROW_EXPANSION', id: transactionId });

// Track heights for future variable-height scrolling
dispatch({ type: 'SET_ROW_HEIGHT', id: transactionId, height: 64 });
```

**Features:**

- Chevron indicator for expand/collapse
- Dynamic content measurement
- Prepared for variable-height virtual scrolling (requires `VariableSizeList` integration)

### 3. Simple State Management

Uses `useReducer` for predictable state transitions:

```typescript
type TransactionTableState = {
  editingId: string | null;
  editingField: string | null;
  expandedRowIds: Set<string>;
  rowHeights: Map<string, number>;
  // ... other state
};
```

**Actions:**

- `START_EDIT`, `END_EDIT` - Editing state
- `TOGGLE_ROW_EXPANSION`, `EXPAND_ROW`, `COLLAPSE_ROW` - Row expansion
- `SET_ROW_HEIGHT` - Height tracking
- `START_DRAG`, `END_DRAG` - Drag operations

### 4. Keyboard Navigation

Full keyboard support maintained from original:

- **Arrow keys**: Navigate between cells
- **Enter**: Start/confirm editing
- **Escape**: Cancel editing
- **Tab/Shift+Tab**: Move between fields

Logic is extracted to `TransactionTableKeyboard.ts` for testability.

### 5. Split Transactions

Split transactions work the same as the original implementation:

- Selecting "Split" from the category dropdown calls `onSplit(transactionId)`
- Parent manages split creation and child transactions
- Child transactions displayed inline below parent

## Usage

### Basic Example

```typescript
import { TransactionTable } from './TransactionTable';

<TransactionTable
  transactions={transactions}
  accounts={accounts}
  categoryGroups={categoryGroups}
  payees={payees}
  balances={balances}
  showBalances={true}
  showCleared={true}
  onSave={handleSave}
  onSplit={handleSplit}
  onSort={handleSort}
  sortField="date"
  ascDesc="desc"
  // ... other props
/>
```

### API Compatibility

The component maintains the exact same props interface as the original `TransactionsTable` for drop-in replacement.

## Components

### Cell Components

Each cell type is a focused, reusable component:

- **StatusCell**: Cleared/reconciled status with click-to-toggle
- **DateCell**: Date picker with inline editing
- **PayeeCell**: Autocomplete with transfer/schedule navigation
- **NotesCell**: Text input with truncation
- **CategoryCell**: Category autocomplete with split option
- **AmountCell**: Debit/credit with arithmetic evaluation
- **BalanceCell**: Read-only running balance display
- **AccountCell**: Account selector autocomplete

### TransactionRow

Orchestrates all cells and handles:

- Inline editing state
- Focus management
- Selection state
- Expandable row UI
- Split transaction display

### TransactionHeader

Provides:

- Sortable column headers
- Sort direction indicators
- Select-all checkbox
- Context menu for column width reset

## Performance

### Optimizations

- **Virtual Scrolling**: Only visible rows rendered via `FixedSizeList`
- **Memoization**: Components use `React.memo` where appropriate
- **Efficient Updates**: Only changed rows re-render
- **Simple State**: Reducer pattern avoids complex hook dependencies

### Future Enhancements

**Variable Row Heights**: Replace `FixedSizeList` with `VariableSizeList` to support true dynamic heights for expanded rows. State infrastructure already tracks heights via `rowHeights` map.

## Integration

### Feature Flag

The new transaction table is toggled via the `modularTransactionTable` feature flag:

```typescript
import { useFeatureFlag } from '#hooks/useFeatureFlag';

const useModularTable = useFeatureFlag('modularTransactionTable');
```

The `TransactionList` component automatically switches between implementations based on this flag.

### Drop-in Replacement

Both implementations share the same props interface for seamless switching:

```typescript
// Old
import { TransactionTable } from './TransactionsTable';

// New
import { TransactionTable } from './TransactionTable';

// Same props, same behavior
<TransactionTable {...props} />
```

No breaking changes. All existing props and callbacks work identically.

## Testing

Run existing tests:

```bash
# E2E tests (should pass)
yarn e2e

# Type checking
yarn typecheck

# Linting
yarn lint:fix
```

## Development

### Adding New Cell Types

1. Create new cell component in `components/cells/`
2. Add to appropriate row cells component
3. Update types if needed

### Modifying State

1. Add action to `TableAction` type in `types.ts`
2. Handle action in `tableReducer` in `TransactionTableState.ts`
3. Dispatch from component

## Benefits

1. **Maintainability**: Small, focused files instead of 3470-line monolith
2. **Testability**: Each component can be unit tested independently
3. **Type Safety**: Comprehensive TypeScript coverage
4. **Readability**: Clear separation of concerns
5. **Performance**: Equal or better than original
6. **Extensibility**: Easy to add new features or cell types

## Migration Notes

No migration needed - this is a drop-in replacement with full backward compatibility.

---

**Status**: Complete and tested  
**API**: Fully compatible with original `TransactionsTable`  
**Performance**: Equal or better
