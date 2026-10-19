import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { makeAmountGrey } from '#components/budget/util';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useFormat } from '#hooks/useFormat';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { AMOUNT_TEXT_STYLE, CELL_BUTTON_STYLE } from './budgetTableStyles';
import { CategoryAmountText } from './CategoryAmountText';
import { useReorderMode } from './ReorderModeContext';

type CategoryBudgetedCellProps = {
  category: CategoryEntity;
  month: string;
  wasRecentLongPress: () => boolean;
};

export function CategoryBudgetedCell({
  category,
  month,
  wasRecentLongPress,
}: CategoryBudgetedCellProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const format = useFormat();
  const bindings = useBudgetBindings();
  const isReordering = useReorderMode();

  return (
    <CellValue<'envelope-budget' | 'tracking-budget', 'budget'>
      binding={bindings.catBudgeted(category.id)}
      type="financial"
    >
      {({ value }) => (
        <Button
          variant="bare"
          bounce={false}
          isDisabled={isReordering}
          aria-label={t(
            'Budgeted amount for {{categoryName}} category, {{amount}}',
            {
              categoryName: category.name,
              amount: format(value, 'financial'),
            },
          )}
          className={css({
            ...CELL_BUTTON_STYLE,
            border: 'none',
            backgroundColor: 'transparent',
            '&[data-hovered], &[data-pressed]': {
              backgroundColor: 'transparent',
            },
          })}
          onPress={() => {
            if (wasRecentLongPress()) {
              return;
            }
            dispatch(
              pushModal({
                modal: {
                  name: 'budget-amount',
                  options: { categoryId: category.id, month },
                },
              }),
            );
          }}
        >
          <CategoryAmountText
            value={value}
            style={{
              ...AMOUNT_TEXT_STYLE,
              ...makeAmountGrey(value),
              textDecoration: 'underline dotted',
              textDecorationColor: theme.buttonPrimaryBackground,
              textUnderlineOffset: 4,
            }}
          />
        </Button>
      )}
    </CellValue>
  );
}
