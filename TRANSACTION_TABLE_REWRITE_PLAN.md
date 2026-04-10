# Transaction Table Rewrite - Architecture & Implementation Plan

## Executive Summary

This document outlines the plan to rewrite the transaction table component (`TransactionsTable.tsx`, currently 3470 lines) to improve maintainability, performance, and user experience, particularly around split transaction editing.

## Current State Analysis

### Problems Identified

1. **God File**: Single 3470-line file with complex interdependencies
2. **Complex Hook-Based State**: Heavy use of React hooks making state flow difficult to trace
3. **Inline Split Editing**: Awkward UX where split transactions can be edited inline, leading to:
   - Confusing intermediate states (when splits don't add up to parent)
   - Users can navigate away mid-split
   - Error popups appearing near transactions
4. **Performance Concerns**: Convoluted code optimized for single-row renders
5. **Keyboard Navigation**: Complex but functional - must be preserved
6. **Maintainability**: Difficult to understand and modify

### Current Architecture

```
TransactionsTable.tsx (3470 lines)
├── TransactionHeader (sorting, selection)
├── TransactionRow (massive component with inline editing)
│   ├── StatusCell, PayeeCell, NotesCell, CategoryCell, AmountCells
│   ├── Split transaction inline editing logic
│   ├── Drag & drop reordering
│   └── Context menus
├── State Management (hooks-based)
│   ├── useState for newTransactions
│   ├── useSplitsExpanded for split visibility
│   ├── useTableNavigator for keyboard nav
│   └── Complex memoization
└── TransactionList.tsx (wrapper with data operations)
```

### What Works Well (Must Preserve)

1. **Keyboard Navigation**: Full keyboard support with arrow keys, Enter, Tab
2. **Performance**: Fast scrolling even with thousands of transactions
3. **Inline Editing**: Quick editing of individual fields
4. **Visual Design**: Clean, consistent theming
5. **Drag & Drop**: Reordering transactions by date
6. **Selection**: Multi-select with batch operations

## Proposed Architecture

### Design Principles

1. **Separation of Concerns**: Split into focused, single-responsibility modules
2. **Simple State Management**: Avoid complex hooks, use clear data flow
3. **Modal for Split Editing**: Pop user into dedicated modal for split transactions
4. **Preserve Performance**: Maintain virtual scrolling and optimized rendering
5. **Maintain Keyboard Nav**: Keep full keyboard accessibility
6. **No Breaking Changes**: Same API for parent components

### New File Structure

```
packages/desktop-client/src/components/transactions/
├── TransactionTable/
│   ├── index.tsx                          # Main export
│   ├── TransactionTable.tsx               # Core table component (~300 lines)
│   ├── TransactionTableState.ts           # State management (~200 lines)
│   ├── TransactionTableKeyboard.ts        # Keyboard navigation (~200 lines)
│   │
│   ├── components/
│   │   ├── TransactionHeader.tsx          # Header with sorting
│   │   ├── TransactionRow.tsx             # Single transaction row (~200 lines)
│   │   ├── TransactionRowChild.tsx        # Child split row (~150 lines)
│   │   ├── TransactionRowNew.tsx          # New transaction entry row
│   │   │
│   │   ├── cells/
│   │   │   ├── StatusCell.tsx
│   │   │   ├── DateCell.tsx
│   │   │   ├── PayeeCell.tsx
│   │   │   ├── NotesCell.tsx
│   │   │   ├── CategoryCell.tsx
│   │   │   ├── AmountCell.tsx
│   │   │   └── BalanceCell.tsx
│   │   │
│   │   └── modals/
│   │       └── SplitTransactionModal.tsx  # Modal for split editing (~300 lines)
│   │
│   ├── hooks/
│   │   ├── useTransactionTableState.ts    # State hook
│   │   ├── useKeyboardNavigation.ts       # Keyboard hook
│   │   └── useTransactionDragDrop.ts      # Drag & drop hook
│   │
│   ├── utils/
│   │   ├── transactionFormatters.ts       # Display formatting
│   │   ├── transactionValidation.ts       # Validation logic
│   │   └── transactionCalculations.ts     # Balance calculations
│   │
│   └── types.ts                           # TypeScript types
│
├── TransactionList.tsx                    # Existing wrapper (minimal changes)
└── SimpleTransactionsTable.tsx            # Existing simple version
```

### Split Transaction Modal Design

#### Current Flow (Inline)

```
1. User clicks "Split" button
2. Child rows appear inline below parent
3. User edits amounts inline
4. If amounts don't match, error popup shows
5. User can navigate away mid-edit (awkward)
```

#### New Flow (Modal)

```
1. User clicks "Split" button
2. Modal opens with:
   - Parent transaction details (read-only)
   - List of split rows (editable)
   - Running total with visual indicator
   - "Add Split" button
   - "Distribute Remainder" button
   - "Cancel" / "Save" buttons
3. User edits in modal (can't navigate away)
4. Real-time validation shows if splits match parent
5. Save button disabled until valid
6. On save, modal closes and table refreshes
```

#### Modal Features

- **Visual Feedback**: Progress bar showing how much of parent amount is allocated
- **Quick Actions**:
  - "Distribute Remainder" - evenly split remaining amount
  - "Clear All" - remove all splits
- **Keyboard Support**: Tab through fields, Enter to add split, Esc to cancel
- **Validation**: Clear error messages, prevent invalid saves

### State Management Approach

Instead of complex hooks, use a simpler reducer-like pattern:

```typescript
// TransactionTableState.ts
type TableState = {
  transactions: TransactionEntity[];
  editingId: string | null;
  editingField: string | null;
  selectedIds: Set<string>;
  expandedSplitIds: Set<string>;
  dragState: DragState | null;
};

type TableAction =
  | { type: 'START_EDIT'; id: string; field: string }
  | { type: 'END_EDIT' }
  | { type: 'TOGGLE_SPLIT'; id: string }
  | { type: 'SELECT'; id: string; isRange: boolean }
  | { type: 'START_DRAG'; id: string }
  | { type: 'END_DRAG' };

function tableReducer(state: TableState, action: TableAction): TableState {
  // Simple, predictable state transitions
}
```

### Keyboard Navigation Strategy

Preserve existing behavior but simplify implementation:

```typescript
// TransactionTableKeyboard.ts
type NavigationContext = {
  currentId: string;
  currentField: string;
  transactions: TransactionEntity[];
  isEditing: boolean;
};

function handleKeyDown(
  event: KeyboardEvent,
  context: NavigationContext,
  actions: TableActions,
): void {
  switch (event.key) {
    case 'ArrowUp': // Move to previous row
    case 'ArrowDown': // Move to next row
    case 'ArrowLeft': // Move to previous field
    case 'ArrowRight': // Move to next field
    case 'Enter': // Start/confirm edit
    case 'Escape': // Cancel edit
    case 'Tab': // Move to next field
    // ... etc
  }
}
```

## Implementation Phases

### Phase 1: Setup & Foundation (2-3 hours)

- [x] Create new directory structure
- [ ] Set up TypeScript types
- [ ] Create base state management
- [ ] Create keyboard navigation utilities

### Phase 2: Core Components (4-5 hours)

- [ ] Implement cell components (StatusCell, DateCell, etc.)
- [ ] Implement TransactionRow (without splits)
- [ ] Implement TransactionHeader
- [ ] Implement basic TransactionTable shell

### Phase 3: Split Transaction Modal (3-4 hours)

- [ ] Design and implement SplitTransactionModal
- [ ] Add validation and real-time feedback
- [ ] Integrate with transaction save flow
- [ ] Add keyboard shortcuts

### Phase 4: Advanced Features (3-4 hours)

- [ ] Implement drag & drop reordering
- [ ] Add selection and batch operations
- [ ] Implement context menus
- [ ] Add split row display (read-only inline)

### Phase 5: Integration (2-3 hours)

- [ ] Replace old TransactionTable with new implementation
- [ ] Update TransactionList.tsx to use new API
- [ ] Ensure backward compatibility

### Phase 6: Testing & Polish (3-4 hours)

- [ ] Run all E2E tests
- [ ] Fix any regressions
- [ ] Performance testing
- [ ] Visual comparison with screenshots
- [ ] Code review and cleanup

**Total Estimated Time: 17-23 hours**

## Testing Strategy

### Unit Tests

- State management functions
- Keyboard navigation logic
- Validation functions
- Calculation utilities

### Integration Tests

- Cell component interactions
- Row component behavior
- Modal save/cancel flows

### E2E Tests (Must Pass)

- All existing Playwright tests in `e2e/transactions.test.ts`
- All existing Playwright tests in `e2e/accounts.test.ts`
- Keyboard navigation flows
- Split transaction creation and editing

### Visual Regression Tests

- Compare screenshots with current implementation
- Ensure theming consistency
- Verify responsive behavior

## Migration Strategy

### Backward Compatibility

- Keep same props interface for `TransactionTable`
- Keep same ref API for parent components
- Maintain same event callbacks

### Feature Flags (Optional)

Could add a feature flag to toggle between old and new implementation:

```typescript
const useNewTransactionTable = useLocalPref('feature.newTransactionTable');
```

### Rollback Plan

- Keep old `TransactionsTable.tsx` as `TransactionsTableLegacy.tsx`
- Easy to revert if critical issues found

## Success Criteria

1. ✅ All existing E2E tests pass
2. ✅ No visual regressions (except intentional split modal)
3. ✅ Keyboard navigation works identically
4. ✅ Performance is equal or better
5. ✅ Code is more maintainable (smaller files, clear responsibilities)
6. ✅ Split transaction editing is improved (modal-based)
7. ✅ No breaking changes to parent components

## Risks & Mitigation

### Risk: Performance Regression

**Mitigation**: Profile before and after, maintain virtual scrolling, use React.memo strategically

### Risk: Keyboard Navigation Breaks

**Mitigation**: Extensive testing, preserve exact key handling logic

### Risk: Visual Differences

**Mitigation**: Pixel-perfect comparison with screenshots, careful CSS preservation

### Risk: E2E Test Failures

**Mitigation**: Run tests frequently during development, fix issues immediately

### Risk: Scope Creep

**Mitigation**: Stick to plan, don't add new features, focus on refactoring

## Next Steps

1. Get approval on architecture
2. Start Phase 1 implementation
3. Iterate through phases
4. Create draft PR for review

## Questions for Review

1. Is the modal approach for split transactions acceptable?
2. Should we keep old implementation as fallback?
3. Any specific performance benchmarks to hit?
4. Timeline expectations?

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-10  
**Author**: Cursor AI Agent
