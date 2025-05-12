import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { AutoTextSize } from 'auto-text-size';

import { type CategoryEntity } from 'loot-core/types/models';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

import { makeAmountGrey } from '@desktop-client/components/budget/util';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { type Binding } from '@desktop-client/components/spreadsheet';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useFormat } from '@desktop-client/components/spreadsheet/useFormat';

type SpentCellProps = {
  binding: Binding<'envelope-budget' | 'tracking-budget', 'sum-amount'>;
  category: CategoryEntity;
  show3Columns?: boolean;
  onPress?: () => void;
};

export function SpentCell({
  binding,
  category,
  show3Columns,
  onPress,
}: SpentCellProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const columnWidth = getColumnWidth({
    show3Columns,
  });
  return (
    <CellValue<'envelope-budget' | 'tracking-budget', 'sum-amount'>
      binding={binding}
      type="financial"
      aria-label={t('Spent amount for {{categoryName}} category', {
        categoryName: category.name,
      })}
    >
      {({ type, value }) => (
        <Button
          variant="bare"
          style={{
            ...PILL_STYLE,
          }}
          onPress={onPress}
          aria-label={t('Show transactions for {{categoryName}} category', {
            categoryName: category.name,
          })}
        >
          <PrivacyFilter>
            <AutoTextSize
              key={value}
              as={Text}
              minFontSizePx={6}
              maxFontSizePx={12}
              mode="oneline"
              style={{
                ...makeAmountGrey(value),
                maxWidth: columnWidth,
                textAlign: 'right',
                fontSize: 12,
              }}
            >
              {format(value, type)}
            </AutoTextSize>
          </PrivacyFilter>
        </Button>
      )}
    </CellValue>
  );
}
