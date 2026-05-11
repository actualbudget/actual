import { Trans } from 'react-i18next';

import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { Cell, CellButton } from '#components/table';

type SplitCategoryCellProps = {
  id: TransactionEntity['id'];
  width: number | 'flex';
  focused: boolean;
  isPreview: boolean;
  isExpanded: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
};

export function SplitCategoryCell({
  id,
  width,
  focused,
  isPreview,
  isExpanded,
  onEdit,
  onToggleSplit,
}: SplitCategoryCellProps) {
  return (
    <Cell
      name="category"
      width={width}
      focused={focused}
      plain
      style={{
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
      }}
    >
      <CellButton
        bare
        style={{
          borderRadius: 4,
          border: '1px solid transparent',
          ':hover': isPreview
            ? {}
            : {
                border: `1px solid ${theme.buttonNormalBorder}`,
              },
        }}
        disabled={isPreview}
        onEdit={() => !isPreview && onEdit(id, 'category')}
        onSelect={() => onToggleSplit(id)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'stretch',
            borderRadius: 4,
            flex: 1,
            padding: 4,
            color: theme.pageTextSubdued,
          }}
        >
          <SvgCheveronDown
            style={{
              color: 'inherit',
              width: 14,
              height: 14,
              transition: 'transform .08s',
              transform: isExpanded ? 'rotateZ(0)' : 'rotateZ(-90deg)',
            }}
          />
          {!isPreview && (
            <Text
              style={{
                fontStyle: 'italic',
                fontWeight: 300,
                userSelect: 'none',
              }}
            >
              <Trans>Split</Trans>
            </Text>
          )}
        </View>
      </CellButton>
    </Cell>
  );
}
