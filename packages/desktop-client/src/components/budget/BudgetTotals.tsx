import React, { memo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useHoverMenu } from '@actual-app/components/hooks/useHoverMenu';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import {
  SvgArrowButtonLeft1,
  SvgArrowButtonRight1,
  SvgArrowButtonSingleLeft1,
} from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Term } from '#components/common/Term';
import { useGlobalPref } from '#hooks/useGlobalPref';

import { RenderMonths } from './RenderMonths';
import { getScrollbarWidth } from './util';

import { useBudgetComponents } from '.';

type BudgetTotalsProps = {
  toggleHiddenCategories: () => void;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;
};

export const BudgetTotals = memo(function BudgetTotals({
  toggleHiddenCategories,
  expandAllCategories,
  collapseAllCategories,
}: BudgetTotalsProps) {
  const { t } = useTranslation();
  const [categoryExpandedStatePref, setCategoryExpandedStatePref] =
    useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const menu = useHoverMenu();

  const cycleExpandedState = () => {
    const nextState = (categoryExpandedState + 1) % 3;
    setCategoryExpandedStatePref(nextState);
  };

  const getExpandStateLabel = () => {
    switch (categoryExpandedState) {
      case 0:
        return t('Expand');
      case 1:
        return t('Fully Expand');
      case 2:
        return t('Collapse');
      default:
        return t('Expand');
    }
  };

  const { BudgetTotalsComponent: MonthComponent } = useBudgetComponents();

  return (
    <View
      data-testid="budget-totals"
      style={{
        backgroundColor: theme.budgetCurrentMonth, //use budget colors, not generic table colors
        flexDirection: 'row',
        flexShrink: 0,
        // Keep the header columns aligned with the scrollable rows below.
        paddingRight: getScrollbarWidth(),
        borderBottom: '1px solid ' + theme.tableBorder,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <View
        style={{
          width: 200 + 100 * categoryExpandedState,
          color: theme.tableHeaderText,
          justifyContent: 'center',
          paddingLeft: 5,
          paddingRight: 5,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <Button
          variant="bare"
          aria-label={getExpandStateLabel()}
          onPress={cycleExpandedState}
          className="hover-visible"
          style={{
            color: 'currentColor',
            padding: 3,
            marginRight: 10,
          }}
        >
          {categoryExpandedState === 0 ? (
            <SvgArrowButtonSingleLeft1
              style={{
                width: 12,
                height: 12,
              }}
            />
          ) : categoryExpandedState === 1 ? (
            <SvgArrowButtonLeft1
              style={{
                width: 12,
                height: 12,
              }}
            />
          ) : (
            <SvgArrowButtonRight1
              style={{
                width: 12,
                height: 12,
              }}
            />
          )}
        </Button>
        <View style={{ flexGrow: '1', fontSize: 13, fontWeight: 600 }}>
          <Term id="category" isFocusable={false}>
            <Trans>Category</Trans>
          </Term>
        </View>
        <Button
          ref={menu.triggerRef}
          {...menu.triggerProps}
          variant="bare"
          aria-label={t('Menu')}
          onPress={menu.toggle}
          style={{ color: 'currentColor', padding: 3 }}
        >
          <SvgDotsHorizontalTriple
            width={15}
            height={15}
            style={{ color: theme.tableHeaderText }}
          />
        </Button>

        <Popover {...menu.popoverProps} style={{ width: 200 }}>
          <Menu
            onMenuSelect={type => {
              menu.close();
              if (type === 'toggle-visibility') {
                toggleHiddenCategories();
              } else if (type === 'expandAllCategories') {
                expandAllCategories();
              } else if (type === 'collapseAllCategories') {
                collapseAllCategories();
              }
            }}
            items={[
              {
                name: 'toggle-visibility',
                text: t('Toggle hidden categories'),
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
      <RenderMonths>
        <MonthComponent />
      </RenderMonths>
    </View>
  );
});
