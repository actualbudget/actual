import React, { useState } from 'react';

import { css } from 'glamor';

import * as monthUtils from 'loot-core/src/shared/months';

import { SvgDotsHorizontalTriple } from '../../../../icons/v1';
import { SvgArrowButtonDown1, SvgArrowButtonUp1 } from '../../../../icons/v2';
import { theme, styles } from '../../../../style';
import { Button } from '../../../common/Button';
import { Menu } from '../../../common/Menu';
import { View } from '../../../common/View';
import { NotesButton } from '../../../NotesButton';
import { NamespaceContext } from '../../../spreadsheet/NamespaceContext';
import { Tooltip } from '../../../tooltips';
import { useRollover } from '../RolloverContext';

import { ToBudget } from './ToBudget';
import { TotalsList } from './TotalsList';

type BudgetSummaryProps = {
  month: string;
  isGoalTemplatesEnabled?: boolean;
};
export function BudgetSummary({
  month,
  isGoalTemplatesEnabled,
}: BudgetSummaryProps) {
  const {
    currentMonth,
    summaryCollapsed: collapsed,
    onBudgetAction,
    onToggleSummaryCollapse,
  } = useRollover();

  const [menuOpen, setMenuOpen] = useState(false);
  function onMenuOpen() {
    setMenuOpen(true);
  }

  function onMenuClose() {
    setMenuOpen(false);
  }

  const prevMonthName = monthUtils.format(monthUtils.prevMonth(month), 'MMM');

  const ExpandOrCollapseIcon = collapsed
    ? SvgArrowButtonDown1
    : SvgArrowButtonUp1;

  return (
    <View
      data-testid="budget-summary"
      style={{
        backgroundColor: theme.tableBackground,
        boxShadow: styles.cardShadow,
        borderRadius: 6,
        marginLeft: 0,
        marginRight: 0,
        marginTop: 5,
        flex: 1,
        cursor: 'default',
        marginBottom: 5,
        overflow: 'hidden',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          style={{
            padding: '0 13px',
            ...(collapsed ? { margin: '10px 0' } : { marginTop: 16 }),
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 10,
              top: 0,
            }}
          >
            <Button
              type="bare"
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} month summary`}
              className="hover-visible"
              onClick={onToggleSummaryCollapse}
            >
              <ExpandOrCollapseIcon
                width={13}
                height={13}
                // The margin is to make it the exact same size as the dots button
                style={{ color: theme.tableTextLight, margin: 1 }}
              />
            </Button>
          </View>

          <div
            className={`${css([
              {
                textAlign: 'center',
                marginTop: 3,
                fontSize: 18,
                fontWeight: 500,
                textDecorationSkip: 'ink',
              },
              currentMonth === month && { fontWeight: 'bold' },
            ])}`}
          >
            {monthUtils.format(month, 'MMMM')}
          </div>

          <View
            style={{
              position: 'absolute',
              right: 10,
              top: 0,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View>
              <NotesButton
                id={`budget-${month}`}
                width={15}
                height={15}
                tooltipPosition="bottom-right"
                defaultColor={theme.tableTextLight}
              />
            </View>
            <View style={{ userSelect: 'none', marginLeft: 2 }}>
              <Button type="bare" aria-label="Menu" onClick={onMenuOpen}>
                <SvgDotsHorizontalTriple
                  width={15}
                  height={15}
                  style={{ color: theme.pageTextLight }}
                />
              </Button>
              {menuOpen && (
                <Tooltip
                  position="bottom-right"
                  width={200}
                  style={{ padding: 0 }}
                  onClose={onMenuClose}
                >
                  <Menu
                    onMenuSelect={type => {
                      onMenuClose();
                      onBudgetAction(month, type);
                    }}
                    items={[
                      { name: 'copy-last', text: 'Copy last month’s budget' },
                      { name: 'set-zero', text: 'Set budgets to zero' },
                      {
                        name: 'set-3-avg',
                        text: 'Set budgets to 3 month average',
                      },
                      ...(isGoalTemplatesEnabled
                        ? [
                            {
                              name: 'check-templates',
                              text: 'Check templates',
                            },
                            {
                              name: 'apply-goal-template',
                              text: 'Apply budget template',
                            },
                            {
                              name: 'overwrite-goal-template',
                              text: 'Overwrite with budget template',
                            },
                            {
                              name: 'cleanup-goal-template',
                              text: 'End of month cleanup',
                            },
                          ]
                        : []),
                    ]}
                  />
                </Tooltip>
              )}
            </View>
          </View>
        </View>

        {collapsed ? (
          <View
            style={{
              alignItems: 'center',
              padding: '10px 20px',
              justifyContent: 'space-between',
              backgroundColor: theme.tableBackground,
              borderTop: '1px solid ' + theme.tableBorder,
            }}
          >
            <ToBudget
              showTotalsTooltipOnHover={true}
              prevMonthName={prevMonthName}
              month={month}
              onBudgetAction={onBudgetAction}
            />
          </View>
        ) : (
          <>
            <TotalsList
              prevMonthName={prevMonthName}
              style={{
                padding: '5px 0',
                marginTop: 17,
                backgroundColor: theme.tableRowHeaderBackground,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.tableBorder,
              }}
            />
            <View style={{ margin: '23px 0' }}>
              <ToBudget
                prevMonthName={prevMonthName}
                month={month}
                onBudgetAction={onBudgetAction}
              />
            </View>
          </>
        )}
      </NamespaceContext.Provider>
    </View>
  );
}
