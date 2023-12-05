import React, { useState } from 'react';

import { css } from 'glamor';

import * as monthUtils from 'loot-core/src/shared/months';

import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import DotsHorizontalTriple from '../../../../icons/v1/DotsHorizontalTriple';
import ArrowButtonDown1 from '../../../../icons/v2/ArrowButtonDown1';
import ArrowButtonUp1 from '../../../../icons/v2/ArrowButtonUp1';
import { theme, styles } from '../../../../style';
import Button from '../../../common/Button';
import Menu from '../../../common/Menu';
import Stack from '../../../common/Stack';
import View from '../../../common/View';
import NotesButton from '../../../NotesButton';
import NamespaceContext from '../../../spreadsheet/NamespaceContext';
import { Tooltip } from '../../../tooltips';
import { useReport } from '../ReportContext';

import ExpenseTotal from './ExpenseTotal';
import IncomeTotal from './IncomeTotal';
import Saved from './Saved';

type BudgetSummaryProps = {
  month?: string;
};
export default function BudgetSummary({ month }: BudgetSummaryProps) {
  let {
    currentMonth,
    summaryCollapsed: collapsed,
    onBudgetAction,
    onToggleSummaryCollapse,
  } = useReport();

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');

  let [menuOpen, setMenuOpen] = useState(false);
  function onMenuOpen() {
    setMenuOpen(true);
  }

  function onMenuClose() {
    setMenuOpen(false);
  }

  let ExpandOrCollapseIcon = collapsed ? ArrowButtonDown1 : ArrowButtonUp1;

  return (
    <View
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
              className="hover-visible"
              onClick={onToggleSummaryCollapse}
            >
              <ExpandOrCollapseIcon
                width={13}
                height={13}
                // The margin is to make it the exact same size as the dots button
                style={{ color: theme.pageTextSubdued, margin: 1 }}
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
                defaultColor={theme.pageTextSubdued} // notes page color
              />
            </View>
            <View style={{ userSelect: 'none' }}>
              <Button type="bare" onClick={onMenuOpen}>
                <DotsHorizontalTriple
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
                      isGoalTemplatesEnabled && {
                        name: 'check-templates',
                        text: 'Check templates',
                      },
                      isGoalTemplatesEnabled && {
                        name: 'apply-goal-template',
                        text: 'Apply budget template',
                      },
                      isGoalTemplatesEnabled && {
                        name: 'overwrite-goal-template',
                        text: 'Overwrite with budget template',
                      },
                    ]}
                  />
                </Tooltip>
              )}
            </View>
          </View>
        </View>

        {!collapsed && (
          <Stack
            spacing={2}
            style={{
              alignSelf: 'center',
              backgroundColor: theme.tableRowHeaderBackground,
              borderRadius: 4,
              padding: '10px 15px',
              marginTop: 13,
            }}
          >
            <IncomeTotal />
            <ExpenseTotal />
          </Stack>
        )}

        {collapsed ? (
          <View
            style={{
              alignItems: 'center',
              padding: '10px 20px',
              justifyContent: 'space-between',
              backgroundColor: theme.tableRowHeaderBackground,
              borderTop: '1px solid ' + theme.tableBorder,
            }}
          >
            <Saved projected={month >= currentMonth} />
          </View>
        ) : (
          <Saved
            projected={month >= currentMonth}
            style={{ marginTop: 13, marginBottom: 20 }}
          />
        )}
      </NamespaceContext.Provider>
    </View>
  );
}
