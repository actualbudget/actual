// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronDown,
  SvgCheveronUp,
} from '@actual-app/components/icons/v1';
import { SvgNotesPaper } from '@actual-app/components/icons/v2';
import { styles, type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import * as monthUtils from 'loot-core/shared/months';

import { BudgetMonthMenu } from '@desktop-client/components/budget/tracking/budgetsummary/BudgetMonthMenu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { Notes } from '@desktop-client/components/Notes';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useNotes } from '@desktop-client/hooks/useNotes';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type TrackingBudgetMonthMenuModalProps = Extract<
  ModalType,
  { name: 'tracking-budget-month-menu' }
>['options'];

export function TrackingBudgetMonthMenuModal({
  month,
  onBudgetAction,
  onEditNotes,
}: TrackingBudgetMonthMenuModalProps) {
  const locale = useLocale();
  const { t } = useTranslation();
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

  const displayMonth = monthUtils.format(month, 'MMMM ‘yy', locale);

  return (
    <Modal
      name="tracking-budget-month-menu"
      containerProps={{
        style: { height: '50vh' },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={displayMonth}
            rightContent={<ModalCloseButton onPress={close} />}
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
                notes={
                  originalNotes?.length > 0 ? originalNotes : t('No notes')
                }
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
                  <Trans>Edit notes</Trans>
                </Button>
              </View>
              <View>
                <Button
                  variant="bare"
                  className={css([
                    buttonStyle,
                    {
                      '&[data-pressed], &[data-hovered]': {
                        backgroundColor: 'transparent',
                        color: buttonStyle.color,
                      },
                    },
                  ])}
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
                  <Trans>Actions</Trans>
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
                    message: t(
                      '{{displayMonth}} budgets have all been set to last month’s budgeted amounts.',
                      { displayMonth },
                    ),
                  });
                }}
                onSetBudgetsToZero={() => {
                  onBudgetAction(month, 'set-zero');
                  close();
                  showUndoNotification({
                    message: t(
                      '{{displayMonth}} budgets have all been set to zero.',
                      { displayMonth },
                    ),
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
                    message: t(
                      '{{displayMonth}} budget templates have been applied.',
                      { displayMonth },
                    ),
                  });
                }}
                onOverwriteWithBudgetTemplates={() => {
                  onBudgetAction(month, 'overwrite-goal-template');
                  close();
                  showUndoNotification({
                    message: t(
                      '{{displayMonth}} budget templates have been overwritten.',
                      { displayMonth },
                    ),
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
