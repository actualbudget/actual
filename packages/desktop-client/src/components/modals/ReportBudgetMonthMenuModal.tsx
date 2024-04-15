// @ts-strict-ignore
import React, { useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import { type NoteEntity } from 'loot-core/src/types/models';

import { SvgCheveronDown, SvgCheveronUp } from '../../icons/v1';
import { SvgNotesPaper } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { BudgetMonthMenu } from '../budget/report/budgetsummary/BudgetMonthMenu';
import { Button } from '../common/Button';
import { Modal, ModalTitle } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';

type ReportBudgetMonthMenuModalProps = {
  modalProps: CommonModalProps;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onEditNotes: (id: string) => void;
  onClose?: () => void;
};

export function ReportBudgetMonthMenuModal({
  modalProps,
  month,
  onBudgetAction,
  onEditNotes,
  onClose,
}: ReportBudgetMonthMenuModalProps) {
  const notesId = `budget-${month}`;
  const data = useLiveQuery<NoteEntity[]>(
    () => q('notes').filter({ id: notesId }).select('*'),
    [notesId],
  );
  const originalNotes = data && data.length > 0 ? data[0].note : null;

  const _onClose = () => {
    modalProps?.onClose();
    onClose?.();
  };

  const _onEditNotes = () => {
    onEditNotes?.(notesId);
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
    flexBasis: '48%',
    marginLeft: '1%',
    marginRight: '1%',
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
      onClose={_onClose}
      padding={0}
      style={{
        flex: 1,
        minHeight: '45vh',
        padding: '0 10px',
        borderRadius: '6px',
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
            overflowY: 'auto',
            flex: 1,
            maxHeight: '30vh',
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
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignContent: 'space-between',
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          <Button style={buttonStyle} onClick={onShowMore}>
            {!showMore ? (
              <SvgCheveronDown
                width={20}
                height={20}
                style={{ paddingRight: 5 }}
              />
            ) : (
              <SvgCheveronUp
                width={20}
                height={20}
                style={{ paddingRight: 5 }}
              />
            )}
            Actions
          </Button>
          <Button style={buttonStyle} onClick={_onEditNotes}>
            <SvgNotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
            Edit notes
          </Button>
        </View>
        {showMore && (
          <BudgetMonthMenu
            style={{ paddingBottom: 10 }}
            getItemStyle={() => defaultMenuItemStyle}
            onCopyLastMonthBudget={() => {
              onBudgetAction(month, 'copy-last');
              _onClose();
            }}
            onSetBudgetsToZero={() => {
              onBudgetAction(month, 'set-zero');
              _onClose();
            }}
            onSetMonthsAverage={numberOfMonths => {
              onBudgetAction(month, `set-${numberOfMonths}-avg`);
              _onClose();
            }}
            onCheckTemplates={() => {
              onBudgetAction(month, 'check-templates');
              _onClose();
            }}
            onApplyBudgetTemplates={() => {
              onBudgetAction(month, 'apply-goal-template');
              _onClose();
            }}
            onOverwriteWithBudgetTemplates={() => {
              onBudgetAction(month, 'overwrite-goal-template');
              _onClose();
            }}
          />
        )}
      </View>
    </Modal>
  );
}
