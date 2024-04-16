// @ts-strict-ignore
import React, { type ComponentPropsWithoutRef, useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import { type NoteEntity } from 'loot-core/src/types/models';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useLocalPref } from '../../hooks/useLocalPref';
import {
  SvgAdd,
  SvgCheveronDown,
  SvgCheveronUp,
  SvgCog,
  SvgSwap,
} from '../../icons/v1';
import { SvgNotesPaper, SvgViewHide, SvgViewShow } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { BudgetMonthMenu } from '../budget/rollover/budgetsummary/BudgetMonthMenu';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Modal, ModalTitle } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';
import { Tooltip } from '../tooltips';

type RolloverBudgetMonthMenuModalProps = {
  modalProps: CommonModalProps;
  month: string;
  onAddCategoryGroup: () => void;
  onToggleHiddenCategories: () => void;
  onSwitchBudgetType: () => void;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onEditNotes: (id: string) => void;
  onClose?: () => void;
};

export function RolloverBudgetMonthMenuModal({
  modalProps,
  month,
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetType,
  onBudgetAction,
  onEditNotes,
  onClose,
}: RolloverBudgetMonthMenuModalProps) {
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
      leftHeaderContent={
        <AdditionalMenu
          onAddCategoryGroup={onAddCategoryGroup}
          onToggleHiddenCategories={onToggleHiddenCategories}
          onSwitchBudgetType={onSwitchBudgetType}
        />
      }
      onClose={_onClose}
      padding={0}
      style={{
        flex: 1,
        height: '45vh',
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
        <View
          style={{
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
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
            onEndOfMonthCleanup={() => {
              onBudgetAction(month, 'cleanup-goal-template');
              _onClose();
            }}
          />
        )}
      </View>
    </Modal>
  );
}

type AdditonalMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onAddCategoryGroup: () => void;
  onToggleHiddenCategories: () => void;
  onSwitchBudgetType: () => void;
};

function AdditionalMenu({
  onAddCategoryGroup,
  onToggleHiddenCategories,
  onSwitchBudgetType,
}: AdditonalMenuProps) {
  const isReportBudgetEnabled = useFeatureFlag('reportBudget');
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
  const [menuOpen, setMenuOpen] = useState(false);

  const itemStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
  };

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'add-category-group':
        onAddCategoryGroup?.();
        break;
      case 'toggle-hidden-categories':
        onToggleHiddenCategories?.();
        break;
      case 'switch-budget-type':
        onSwitchBudgetType?.();
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
    }
    setMenuOpen(false);
  };

  return (
    <View>
      <Button
        type="bare"
        aria-label="Menu"
        onClick={() => {
          setMenuOpen(true);
        }}
      >
        <SvgCog width={17} height={17} style={{ color: 'currentColor' }} />
      </Button>
      {menuOpen && (
        <Tooltip
          position="bottom-left"
          style={{ padding: 0 }}
          onClose={() => {
            setMenuOpen(false);
          }}
        >
          <Menu
            getItemStyle={() => itemStyle}
            onMenuSelect={onMenuSelect}
            items={[
              {
                name: 'add-category-group',
                text: 'Add category group',
                icon: SvgAdd,
                iconSize: 16,
              },
              {
                name: 'toggle-hidden-categories',
                text: `${!showHiddenCategories ? 'Show' : 'Hide'} hidden categories`,
                icon: !showHiddenCategories ? SvgViewShow : SvgViewHide,
                iconSize: 16,
              },
              ...(isReportBudgetEnabled
                ? [
                    {
                      name: 'switch-budget-type',
                      text: 'Switch budget type',
                      icon: SvgSwap,
                      iconSize: 16,
                    },
                  ]
                : []),
            ]}
          />
        </Tooltip>
      )}
    </View>
  );
}
