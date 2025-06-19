import React, { type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  BalanceWithCarryover,
  CarryoverIndicator,
} from '@desktop-client/components/budget/BalanceWithCarryover';
import { useEnvelopeSheetValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { useCategory } from '@desktop-client/hooks/useCategory';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type EnvelopeIncomeBalanceMenuModalProps = Omit<
  Extract<ModalType, { name: 'envelope-income-balance-menu' }>['options'],
  'month'
>;

export function EnvelopeIncomeBalanceMenuModal({
  categoryId,
  onCarryover,
  onShowActivity,
}: EnvelopeIncomeBalanceMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const { t } = useTranslation();
  const category = useCategory(categoryId);

  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );

  if (!category) {
    return null;
  }

  return (
    <Modal name="envelope-income-balance-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={category.name} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: 400,
              }}
            >
              <Trans>Balance</Trans>
            </Text>
            <BalanceWithCarryover
              isDisabled
              shouldInlineGoalStatus
              carryover={envelopeBudget.catCarryover(categoryId)}
              balance={envelopeBudget.catBalance(categoryId)}
              goal={envelopeBudget.catGoal(categoryId)}
              budgeted={envelopeBudget.catBudgeted(categoryId)}
              longGoal={envelopeBudget.catLongGoal(categoryId)}
              CarryoverIndicator={({ style }) => (
                <CarryoverIndicator
                  style={{
                    width: 15,
                    height: 15,
                    display: 'inline-flex',
                    position: 'relative',
                    ...style,
                  }}
                />
              )}
            >
              {props => (
                <CellValueText
                  {...props}
                  style={{
                    textAlign: 'center',
                    ...styles.veryLargeText,
                  }}
                />
              )}
            </BalanceWithCarryover>
          </View>
          <Menu
            getItemStyle={() => defaultMenuItemStyle}
            onMenuSelect={name => {
              switch (name) {
                case 'carryover':
                  onCarryover?.(!carryover);
                  break;
                case 'view':
                  onShowActivity?.();
                  break;
                default:
                  throw new Error(`Unrecognized menu option: ${name}`);
              }
            }}
            items={[
              {
                name: 'carryover',
                text: carryover
                  ? t('Disable auto hold')
                  : t('Enable auto hold'),
              },
              {
                name: 'view',
                text: t('View transactions'),
              },
            ]}
          />
        </>
      )}
    </Modal>
  );
}
