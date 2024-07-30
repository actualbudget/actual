// @ts-strict-ignore
import React, { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { useNotes } from '../../hooks/useNotes';
import { useUndo } from '../../hooks/useUndo';
import { SvgCheveronDown, SvgCheveronUp } from '../../icons/v1';
import { SvgNotesPaper } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { BudgetMonthMenu } from '../budget/rollover/budgetsummary/BudgetMonthMenu';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { View } from '../common/View';
import { Notes } from '../Notes';

type RolloverBudgetMonthMenuModalProps = {
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onEditNotes: (month: string) => void;
};

export function RolloverBudgetMonthMenuModal({
  month,
  onBudgetAction,
  onEditNotes,
}: RolloverBudgetMonthMenuModalProps) {
  const originalNotes = useNotes(`budget-${month}`);
  const { showUndoNotification } = useUndo();

  const _onEditNotes = () => {
    onEditNotes?.(month);
  };

  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const buttonStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
    color: theme.formLabelText,
    // Adjust based on desired number of buttons per row.
    flexBasis: '100%',
  };

  const [showMore, setShowMore] = useState(false);

  const onShowMore = () => {
    setShowMore(!showMore);
  };

  const displayMonth = monthUtils.format(month, 'MMMM ‘yy');

  return (
    <Modal
      name="rollover-budget-month-menu"
      containerProps={{
        style: { height: '50vh' },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={displayMonth}
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
            }}
          >
            <View
              style={{
                display: showMore ? 'none' : undefined,
                overflowY: 'auto',
                flex: 1,
              }}
            >
              <Notes
                notes={originalNotes?.length > 0 ? originalNotes : 'No notes'}
                editable={false}
                focused={false}
                getStyle={() => ({
                  borderRadius: 6,
                  ...((!originalNotes || originalNotes.length === 0) && {
                    justifySelf: 'center',
                    alignSelf: 'center',
                    color: theme.pageTextSubdued,
                  }),
                })}
              />
            </View>
            <View style={{ paddingTop: 10, gap: 5 }}>
              <View
                style={{
                  display: showMore ? 'none' : undefined,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignContent: 'space-between',
                }}
              >
                <Button style={buttonStyle} onPress={_onEditNotes}>
                  <SvgNotesPaper
                    width={20}
                    height={20}
                    style={{ paddingRight: 5 }}
                  />
                  Edit notes
                </Button>
              </View>
              <View>
                <Button
                  variant="bare"
                  style={({ isPressed, isHovered }) => ({
                    ...buttonStyle,
                    ...(isPressed || isHovered
                      ? {
                          backgroundColor: 'transparent',
                          color: buttonStyle.color,
                        }
                      : {}),
                  })}
                  onPress={onShowMore}
                >
                  {!showMore ? (
                    <SvgCheveronUp
                      width={30}
                      height={30}
                      style={{ paddingRight: 5 }}
                    />
                  ) : (
                    <SvgCheveronDown
                      width={30}
                      height={30}
                      style={{ paddingRight: 5 }}
                    />
                  )}
                  Actions
                </Button>
              </View>
            </View>
            {showMore && (
              <BudgetMonthMenu
                style={{ overflowY: 'auto', paddingTop: 10 }}
                getItemStyle={() => defaultMenuItemStyle}
                onCopyLastMonthBudget={() => {
                  onBudgetAction(month, 'copy-last');
                  close();
                  showUndoNotification({
                    message: `${displayMonth} budgets have all been set to last month’s budgeted amounts.`,
                  });
                }}
                onSetBudgetsToZero={() => {
                  onBudgetAction(month, 'set-zero');
                  close();
                  showUndoNotification({
                    message: `${displayMonth} budgets have all been set to zero.`,
                  });
                }}
                onSetMonthsAverage={numberOfMonths => {
                  onBudgetAction(month, `set-${numberOfMonths}-avg`);
                  close();
                  showUndoNotification({
                    message: `${displayMonth} budgets have all been set to ${numberOfMonths === 12 ? 'yearly' : `${numberOfMonths} month`} average.`,
                  });
                }}
                onCheckTemplates={() => {
                  onBudgetAction(month, 'check-templates');
                  close();
                }}
                onApplyBudgetTemplates={() => {
                  onBudgetAction(month, 'apply-goal-template');
                  close();
                  showUndoNotification({
                    message: `${displayMonth} budget templates have been applied.`,
                  });
                }}
                onOverwriteWithBudgetTemplates={() => {
                  onBudgetAction(month, 'overwrite-goal-template');
                  close();
                  showUndoNotification({
                    message: `${displayMonth} budget templates have been overwritten.`,
                  });
                }}
                onEndOfMonthCleanup={() => {
                  onBudgetAction(month, 'cleanup-goal-template');
                  close();
                  showUndoNotification({
                    message: `${displayMonth} end-of-month cleanup templates have been applied.`,
                  });
                }}
              />
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
