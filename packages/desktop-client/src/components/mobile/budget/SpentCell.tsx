import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

import { type CategoryEntity } from 'loot-core/types/models';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

import { makeAmountGrey } from '@desktop-client/components/budget/util';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useCategoryScheduleGoalTemplateIndicator } from '@desktop-client/hooks/useCategoryScheduleGoalTemplateIndicator';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { type Binding } from '@desktop-client/spreadsheet';

type SpentCellProps = {
  binding: Binding<'envelope-budget' | 'tracking-budget', 'sum-amount'>;
  category: CategoryEntity;
  month: string;
  show3Columns?: boolean;
  onPress?: () => void;
};

export function SpentCell({
  binding,
  category,
  month,
  show3Columns,
  onPress,
}: SpentCellProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const columnWidth = getColumnWidth({
    show3Columns,
  });

  const { schedule, scheduleStatus, isScheduleRecurring } =
    useCategoryScheduleGoalTemplateIndicator({
      category,
      month,
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
        <>
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
          {schedule && scheduleStatus && (
            <View
              style={{
                position: 'absolute',
                right: '-3px',
                top: '-5px',
                borderRadius: '50%',
                color:
                  scheduleStatus === 'missed'
                    ? theme.errorText
                    : scheduleStatus === 'due'
                      ? theme.warningText
                      : theme.upcomingText,
              }}
            >
              {isScheduleRecurring ? (
                <SvgArrowsSynchronize width={11} height={11} />
              ) : (
                <SvgCalendar3 width={10} height={10} />
              )}
            </View>
          )}
        </>
      )}
    </CellValue>
  );
}
