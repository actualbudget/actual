import React, { useRef, useState } from 'react';

import { css } from 'glamor';

import * as monthUtils from 'loot-core/src/shared/months';

import { SvgDotsHorizontalTriple } from '../../../../icons/v1';
import { SvgArrowButtonDown1, SvgArrowButtonUp1 } from '../../../../icons/v2';
import { theme, styles } from '../../../../style';
import { Button } from '../../../common/Button2';
import { Popover } from '../../../common/Popover';
import { View } from '../../../common/View';
import { NotesButton } from '../../../NotesButton';
import { NamespaceContext } from '../../../spreadsheet/NamespaceContext';
import { useRollover } from '../RolloverContext';

import { BudgetMonthMenu } from './BudgetMonthMenu';
import { ToBudget } from './ToBudget';
import { TotalsList } from './TotalsList';

type BudgetSummaryProps = {
  month: string;
  isGoalTemplatesEnabled?: boolean;
};
export function BudgetSummary({ month }: BudgetSummaryProps) {
  const {
    currentMonth,
    summaryCollapsed: collapsed,
    onBudgetAction,
    onToggleSummaryCollapse,
  } = useRollover();

  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

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
              variant="bare"
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} month summary`}
              className="hover-visible"
              onPress={onToggleSummaryCollapse}
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
                tooltipPosition="bottom right"
                defaultColor={theme.tableTextLight}
              />
            </View>
            <View style={{ userSelect: 'none', marginLeft: 2 }}>
              <Button
                ref={triggerRef}
                variant="bare"
                aria-label="Menu"
                onPress={onMenuOpen}
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
                onOpenChange={onMenuClose}
              >
                <BudgetMonthMenu
                  onCopyLastMonthBudget={() => {
                    onBudgetAction(month, 'copy-last');
                    onMenuClose();
                  }}
                  onSetBudgetsToZero={() => {
                    onBudgetAction(month, 'set-zero');
                    onMenuClose();
                  }}
                  onSetMonthsAverage={numberOfMonths => {
                    onBudgetAction(month, `set-${numberOfMonths}-avg`);
                    onMenuClose();
                  }}
                  onCheckTemplates={() => {
                    onBudgetAction(month, 'check-templates');
                    onMenuClose();
                  }}
                  onApplyBudgetTemplates={() => {
                    onBudgetAction(month, 'apply-goal-template');
                    onMenuClose();
                  }}
                  onOverwriteWithBudgetTemplates={() => {
                    onBudgetAction(month, 'overwrite-goal-template');
                    onMenuClose();
                  }}
                  onEndOfMonthCleanup={() => {
                    onBudgetAction(month, 'cleanup-goal-template');
                    onMenuClose();
                  }}
                />
              </Popover>
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
              prevMonthName={prevMonthName}
              month={month}
              onBudgetAction={onBudgetAction}
              isCollapsed
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
