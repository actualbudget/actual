# Transaction Table - New Modular Implementation

## Overview

This directory contains the rewritten transaction table component, breaking the original 3470-line god file into a maintainable, modular architecture.

## Architecture

### File Structure

```
TransactionTable/
├── index.ts                              # Main exports
├── types.ts                              # TypeScript type definitions
├── TransactionTableState.ts              # State management (reducer pattern)
├── TransactionTableKeyboard.ts           # Keyboard navigation utilities
├── TransactionTable.tsx                  # Main table component
├── components/
│   ├── TransactionHeader.tsx             # Sortable header row
│   ├── TransactionRow.tsx                # Individual transaction row
│   ├── cells/                            # Reusable cell components
│   │   ├── StatusCell.tsx                # Cleared/reconciled status
│   │   ├── DateCell.tsx                  # Date picker
│   │   ├── PayeeCell.tsx                 # Payee autocomplete
│   │   ├── NotesCell.tsx                 # Notes input
│   │   ├── CategoryCell.tsx              # Category autocomplete
│   │   ├── AmountCell.tsx                # Debit/credit amounts
│   │   ├── BalanceCell.tsx               # Running balance
│   │   ├── AccountCell.tsx               # Account selector
│   │   └── index.ts                      # Cell exports
│   └── modals/
│       └── SplitTransactionModal.tsx     # Split transaction editor
└── utils/
    └── transactionFormatters.ts          # Serialization utilities
```

## Usage

### Basic Usage

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
  showAccount={false}
  showCategory={true}
  currentAccountId={accountId}
  dateFormat="MM/dd/yyyy"
  hideFraction={false}
  onSave={handleSave}
  onApplyRules={handleApplyRules}
  onSort={handleSort}
  sortField="date"
  ascDesc="desc"
  // ... other props
/>
```

### API Compatibility

The new `TransactionTable` component maintains the same API as the original, ensuring drop-in replacement compatibility.

## Key Features

### 1. Expandable Rows

Rows can expand to show additional content:

```typescript
// State management
dispatch({ type: 'TOGGLE_ROW_EXPANSION', id: transactionId });
dispatch({ type: 'SET_ROW_HEIGHT', id: transactionId, height: 64 });

// In component
<TransactionRow
  isExpanded={isRowExpanded(state, transaction.id)}
  rowHeight={getRowHeight(state, transaction.id)}
  onToggleRowExpansion={handleToggleRowExpansion}
  onSetRowHeight={handleSetRowHeight}
  // ... other props
/>
```

**Features:**

- Chevron indicator
- Smooth expand/collapse transitions
- Dynamic content area
- Height measurement and reporting
- Works with virtual scrolling

**Use Cases:**

- Show full notes
- Display transaction metadata
- Show related transactions
- Alternative split display

### 2. Split Transaction Modal

Instead of awkward inline editing, splits are edited in a dedicated modal:

```typescript
import { SplitTransactionModal } from './components/modals/SplitTransactionModal';

<SplitTransactionModal
  transaction={parentTransaction}
  childTransactions={childTransactions}
  categoryGroups={categoryGroups}
  dateFormat={dateFormat}
  hideFraction={hideFraction}
  onSave={handleSaveSplits}
  onClose={handleCloseModal}
/>
```

**Features:**

- Visual progress bar
- Real-time validation
- Add/remove splits
- Distribute remainder
- Clear error messages
- Keyboard shortcuts

### 3. Simple State Management

Reducer-based state management:

```typescript
import { createInitialState, tableReducer } from './TransactionTableState';

const [state, dispatch] = useReducer(tableReducer, createInitialState());

// Actions
dispatch({ type: 'START_EDIT', id, field });
dispatch({ type: 'END_EDIT' });
dispatch({ type: 'TOGGLE_SPLIT', id });
dispatch({ type: 'EXPAND_ROW', id });
```

### 4. Keyboard Navigation

Extracted keyboard navigation logic:

```typescript
import { handleKeyboardNavigation } from './TransactionTableKeyboard';

const handled = handleKeyboardNavigation(
  event,
  {
    currentId,
    currentField,
    transactions,
    isEditing,
    visibleTransactions,
  },
  {
    onEdit,
    onEndEdit,
    onSave,
    onCancel,
    onMoveUp,
    onMoveDown,
    onMoveLeft,
    onMoveRight,
  },
  { showAccount: true },
);
```

**Supported Keys:**

- Arrow keys: Navigate between cells
- Enter: Start/confirm edit
- Escape: Cancel edit
- Tab/Shift+Tab: Move between fields

## Components

### Cell Components

Each cell is a focused, reusable component:

#### StatusCell

- Displays cleared/reconciled status
- Click to toggle cleared state
- Icons for different statuses

#### DateCell

- Date picker integration
- Formatted date display
- Inline editing

#### PayeeCell

- Payee autocomplete
- Transfer/schedule icons
- Clickable navigation

#### NotesCell

- Text input
- Inline editing
- Truncated display

#### CategoryCell

- Category autocomplete
- Split indicator
- Hidden categories support

#### AmountCell

- Debit/credit display
- Arithmetic evaluation
- Tabular formatting

#### BalanceCell

- Running balance
- Read-only display

#### AccountCell

- Account autocomplete
- Account name display

### TransactionRow

Main row component that:

- Integrates all cells
- Handles inline editing
- Manages focus state
- Supports selection
- Implements expandable rows
- Handles split display

### TransactionHeader

Header component that:

- Displays column headers
- Handles sorting
- Shows sort indicators
- Select-all checkbox
- Keyboard shortcuts

### TransactionTable

Main table component that:

- Orchestrates all components
- Manages state
- Handles virtual scrolling
- Processes events
- Renders rows

## State Management

### State Structure

```typescript
type TransactionTableState = {
  editingId: string | null;
  editingField: string | null;
  expandedSplitIds: Set<string>;
  expandedRowIds: Set<string>;
  rowHeights: Map<string, number>;
  dragState: DragState | null;
};
```

### Actions

- `START_EDIT` - Begin editing a cell
- `END_EDIT` - End editing
- `TOGGLE_SPLIT` - Toggle split visibility
- `EXPAND_SPLIT` - Expand split
- `COLLAPSE_SPLIT` - Collapse split
- `TOGGLE_ROW_EXPANSION` - Toggle row expansion
- `EXPAND_ROW` - Expand row
- `COLLAPSE_ROW` - Collapse row
- `SET_ROW_HEIGHT` - Set row height
- `START_DRAG` - Begin drag operation
- `END_DRAG` - End drag operation
- `RESET` - Reset to initial state

### Helper Functions

- `isTransactionExpanded()` - Check if transaction is expanded
- `isTransactionEditing()` - Check if transaction is being edited
- `isRowExpanded()` - Check if row is expanded
- `getRowHeight()` - Get row height
- `getVisibleTransactions()` - Filter visible transactions

## Integration Guide

### Step 1: Import

```typescript
import { TransactionTable } from './TransactionTable';
import type { TransactionTableProps } from './TransactionTable';
```

### Step 2: Replace Old Table

Replace the old `TransactionTable` import with the new one:

```typescript
// Old
import { TransactionTable } from './TransactionsTable';

// New
import { TransactionTable } from './TransactionTable';
```

### Step 3: Add Split Modal State

```typescript
const [splitModalOpen, setSplitModalOpen] = useState(false);
const [splitTransaction, setSplitTransaction] =
  useState<TransactionEntity | null>(null);
```

### Step 4: Handle Split Button Click

```typescript
const handleSplitClick = (transaction: TransactionEntity) => {
  setSplitTransaction(transaction);
  setSplitModalOpen(true);
};
```

### Step 5: Render Split Modal

```typescript
{splitModalOpen && splitTransaction && (
  <SplitTransactionModal
    transaction={splitTransaction}
    childTransactions={getChildTransactions(splitTransaction.id)}
    categoryGroups={categoryGroups}
    dateFormat={dateFormat}
    hideFraction={hideFraction}
    onSave={handleSaveSplits}
    onClose={() => setSplitModalOpen(false)}
  />
)}
```

## Testing

### Unit Tests

Test individual components:

```typescript
import { StatusCell } from './components/cells/StatusCell';

test('StatusCell toggles cleared state', () => {
  // Test implementation
});
```

### Integration Tests

Test component interactions:

```typescript
import { TransactionRow } from './components/TransactionRow';

test('TransactionRow handles editing', () => {
  // Test implementation
});
```

### E2E Tests

Existing Playwright tests should pass:

- `e2e/transactions.test.ts`
- `e2e/accounts.test.ts`

## Performance

### Optimizations

- **Memoization**: Components use React.memo where appropriate
- **Virtual Scrolling**: Only visible rows are rendered
- **Efficient Updates**: Only changed rows re-render
- **Simple State**: Reducer pattern is predictable and fast

### Benchmarks

Performance should be equal or better than the original implementation due to:

- Cleaner code allows better optimization
- Proper memoization boundaries
- Reduced complexity

## Migration Notes

### Breaking Changes

None. The API is backward compatible.

### Deprecations

None. All existing features are supported.

### New Features

1. **Expandable Rows** - Rows can expand to show additional content
2. **Split Modal** - Better UX for split transactions
3. **Modular Architecture** - Easier to maintain and extend

## Troubleshooting

### Issue: Rows not expanding

Check that state management is properly initialized:

```typescript
const [state, dispatch] = useReducer(tableReducer, createInitialState());
```

### Issue: Keyboard navigation not working

Ensure keyboard handler is attached:

```typescript
onKeyDown = { handleKeyDown };
```

### Issue: Split modal not opening

Check modal state and trigger logic:

```typescript
const [splitModalOpen, setSplitModalOpen] = useState(false);
```

## Future Enhancements

### Variable Row Heights

Implement `VariableSizeList` support for true dynamic row heights:

```typescript
// Instead of FixedSizeList
import { VariableSizeList } from 'react-window';

<VariableSizeList
  itemSize={index => getRowHeight(state, items[index].id)}
  // ... other props
/>
```

### Additional Cell Types

Easy to add new cell types:

```typescript
// Create new cell component
export function CustomCell({ ... }) {
  return <Cell ... />;
}

// Add to TransactionRow
<CustomCell ... />
```

### Enhanced Expandable Content

Expandable rows can show any content:

```typescript
{isExpanded && (
  <View>
    <RelatedTransactions transactionId={transaction.id} />
    <TransactionHistory transactionId={transaction.id} />
    <CustomMetadata transaction={transaction} />
  </View>
)}
```

## Contributing

When modifying this code:

1. Keep files focused and small
2. Use TypeScript strictly
3. Follow existing patterns
4. Test thoroughly
5. Update documentation

## Questions?

See:

- [Architecture Plan](../../../TRANSACTION_TABLE_REWRITE_PLAN.md)
- [Implementation Summary](../../../TRANSACTION_TABLE_IMPLEMENTATION_SUMMARY.md)
- [PR #7454](https://github.com/actualbudget/actual/pull/7454)

---

**Version**: 1.0  
**Status**: Implementation complete, integration pending  
**Last Updated**: April 10, 2026
