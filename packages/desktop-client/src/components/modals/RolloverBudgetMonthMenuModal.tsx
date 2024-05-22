// @ts-strict-ignore
import React, { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { useNotes } from '../../hooks/useNotes';
import { SvgCheveronDown, SvgCheveronUp } from '../../icons/v1';
import { SvgNotesPaper } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { BudgetMonthMenu } from '../budget/rollover/budgetsummary/BudgetMonthMenu';
import { Button } from '../common/Button';
import { Modal, ModalTitle } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';

type RolloverBudgetMonthMenuModalProps = {
  modalProps: CommonModalProps;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onEditNotes: (month: string) => void;
};

export function RolloverBudgetMonthMenuModal({
  modalProps,
  month,
  onBudgetAction,
  onEditNotes,
}: RolloverBudgetMonthMenuModalProps) {
  const originalNotes = useNotes(`budget-${month}`);

  const onClose = () => {
    modalProps.onClose();
  };

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

  return (
    <Modal
      title={<ModalTitle title={monthUtils.format(month, 'MMMM ‘yy')} />}
      showHeader
      focusAfterClose={false}
      {...modalProps}
      onClose={onClose}
      style={{
        height: '50vh',
      }}
    >
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
            <Button style={buttonStyle} onClick={_onEditNotes}>
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
              type="bare"
              style={buttonStyle}
              activeStyle={{
                backgroundColor: 'transparent',
                color: buttonStyle.color,
              }}
              hoveredStyle={{
                backgroundColor: 'transparent',
                color: buttonStyle.color,
              }}
              onClick={onShowMore}
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
              onClose();
            }}
            onSetBudgetsToZero={() => {
              onBudgetAction(month, 'set-zero');
              onClose();
            }}
            onSetMonthsAverage={numberOfMonths => {
              onBudgetAction(month, `set-${numberOfMonths}-avg`);
              onClose();
            }}
            onCheckTemplates={() => {
              onBudgetAction(month, 'check-templates');
              onClose();
            }}
            onApplyBudgetTemplates={() => {
              onBudgetAction(month, 'apply-goal-template');
              onClose();
            }}
            onOverwriteWithBudgetTemplates={() => {
              onBudgetAction(month, 'overwrite-goal-template');
              onClose();
            }}
            onEndOfMonthCleanup={() => {
              onBudgetAction(month, 'cleanup-goal-template');
              onClose();
            }}
          />
        )}
      </View>
    </Modal>
  );
}
