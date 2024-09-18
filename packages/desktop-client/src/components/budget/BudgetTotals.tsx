import React, { type ComponentProps, memo, useRef, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useSyncedPref } from '../../hooks/useSyncedPref';

import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { theme, styles } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { RenderMonths } from './RenderMonths';
import { getScrollbarWidth } from './util';

function Legend({ title, color }: { title: string; color: string }) {
  return (
    <View
      style={{
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          marginRight: 5,
          borderRadius: 1000,
          width: 14,
          height: 14,
          backgroundColor: color,
        }}
      />
      <Text
        style={{
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

type BudgetTotalsProps = {
  MonthComponent: ComponentProps<typeof RenderMonths>['component'];
  setShowHiddenCategoriesPef: (value: boolean) => void;
  showHiddenCategories: boolean;
  setShowProgress: (value: boolean) => void;
  showProgress: boolean;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;
};

export const BudgetTotals = memo(function BudgetTotals({
  MonthComponent,
  setShowHiddenCategoriesPef,
  showHiddenCategories,
  setShowProgress,
  showProgress,
  expandAllCategories,
  collapseAllCategories,
}: BudgetTotalsProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <View
      data-testid="budget-totals"
      style={{
        backgroundColor: theme.tableBackground,
        flexDirection: 'row',
        flexShrink: 0,
        boxShadow: styles.cardShadow,
        marginLeft: 5,
        marginRight: 5 + getScrollbarWidth(),
        borderRadius: '4px 4px 0 0',
        borderBottom: '1px solid ' + theme.tableBorder,
      }}
    >
      <View
        style={{
          width: 200,
          color: theme.pageTextLight,
          justifyContent: 'center',
          paddingLeft: 15,
          paddingRight: 5,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <View style={{ flexGrow: '1' }}>
          <Trans>Category</Trans>
        </View>
        <Button
          ref={triggerRef}
          variant="bare"
          aria-label={t('Menu')}
          onPress={() => setMenuOpen(true)}
          style={{ color: 'currentColor', padding: 3 }}
        >
          <SvgDotsHorizontalTriple
            width={15}
            height={15}
            style={{ color: theme.pageTextLight }}
          />
        </Button>

        <Popover
          triggerRef={triggerRef}
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          style={{ width: 210 }}
        >
          <Menu
            onMenuSelect={type => {
              if (type === 'showHiddenCategories') {
                setShowHiddenCategoriesPef(!showHiddenCategories);
              } else if (type === 'showProgress') {
                setShowProgress(!showProgress);
              } else if (type === 'expandAllCategories') {
                expandAllCategories();
                setMenuOpen(false);
              } else if (type === 'collapseAllCategories') {
                collapseAllCategories();
                setMenuOpen(false);
              }
            }}
            items={[
              {
                name: 'showHiddenCategories',
                text: t('Show hidden categories'),
                toggle: showHiddenCategories,
              },
              {
                name: 'showProgress',
                text: t('Show progress bars'),
                toggle: showProgress,
                customTooltip: (
                  <View
                    style={{
                      padding: 10,
                      paddingBottom: 0,
                    }}
                    >
                    {budgetType === 'rollover' && (
                      <>
                        <Legend
                          title="Rollover added"
                          color={theme.reportsLightPurple}
                        />
                        <Legend
                          title="Rollover spent"
                          color={theme.reportsLightGreen}
                        />
                        <Legend
                          title="Rollover overspent"
                          color={theme.reportsLightRed}
                        />
                      </>
                    )}
                    <Legend title="Budgeted" color={theme.reportsPurple} />
                    <Legend title="Spent" color={theme.reportsGreen} />
                    <Legend title="Overspent" color={theme.reportsRed} />
                  </View>
                ),
              },
              {
                name: 'expandAllCategories',
                text: t('Expand all'),
              },
              {
                name: 'collapseAllCategories',
                text: t('Collapse all'),
              },
            ]}
          />
        </Popover>
      </View>
      <RenderMonths component={MonthComponent} />
    </View>
  );
});
