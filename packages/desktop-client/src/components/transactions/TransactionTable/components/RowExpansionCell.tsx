import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { SelectCell } from '#components/table';

type RowExpansionCellProps = {
  id: TransactionEntity['id'];
  focused: boolean;
  selected: boolean;
  showSelection: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onToggleExpansion: () => void;
};

export function RowExpansionCell({
  id,
  focused,
  selected,
  showSelection,
  isExpanded,
  onSelect,
  onEdit,
  onToggleExpansion,
}: RowExpansionCellProps) {
  if (showSelection) {
    return (
      <SelectCell
        exposed
        focused={focused}
        selected={selected}
        width={20}
        onSelect={onSelect}
        onEdit={() => onEdit(id, 'select')}
      />
    );
  }

  return (
    <View style={{ width: 20, flexShrink: 0 }}>
      <button
        onClick={onToggleExpansion}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
        aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
      >
        <SvgCheveronDown
          style={{
            width: 12,
            height: 12,
            color: theme.pageTextSubdued,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>
    </View>
  );
}
