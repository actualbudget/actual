import React, { memo, useState } from 'react';

import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import { theme, styles } from '../../style';
import Button from '../common/Button';
import Menu from '../common/Menu';
import View from '../common/View';
import { Tooltip } from '../tooltips';

import RenderMonths from './RenderMonths';
import { getScrollbarWidth } from './util';

const BudgetTotals = memo(function BudgetTotals({
  MonthComponent,
  toggleHiddenCategories,
  expandAllCategories,
  collapseAllCategories,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View
      data-testid="budget-totals"
      style={{
        backgroundColor: theme.tableHeaderBackground,
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
        <View style={{ flexGrow: '1' }}>Category</View>
        <Button
          type="bare"
          onClick={() => {
            setMenuOpen(true);
          }}
          style={{ color: 'currentColor', padding: 3 }}
        >
          <DotsHorizontalTriple
            width={15}
            height={15}
            style={{ color: theme.altpageTextSubdued }}
          />
          {menuOpen && (
            <Tooltip
              position="bottom-right"
              width={200}
              style={{ padding: 0 }}
              onClose={() => {
                setMenuOpen(false);
              }}
            >
              <Menu
                onMenuSelect={type => {
                  if (type === 'toggle-visibility') {
                    toggleHiddenCategories();
                  } else if (type === 'expandAllCategories') {
                    expandAllCategories();
                  } else if (type === 'collapseAllCategories') {
                    collapseAllCategories();
                  }
                  setMenuOpen(false);
                }}
                items={[
                  {
                    name: 'toggle-visibility',
                    text: 'Toggle hidden categories',
                  },
                  {
                    name: 'expandAllCategories',
                    text: 'Expand all',
                  },
                  {
                    name: 'collapseAllCategories',
                    text: 'Collapse all',
                  },
                ]}
              />
            </Tooltip>
          )}
        </Button>
      </View>
      <RenderMonths component={MonthComponent} />
    </View>
  );
});

export default BudgetTotals;
