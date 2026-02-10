import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheckAll,
  SvgUncheckAll,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import type { AccountEntity } from 'loot-core/types/models';

import { GraphButton } from './GraphButton';

import { Checkbox } from '@desktop-client/components/forms';

type AccountSelectorProps = {
  accounts: AccountEntity[];
  selectedAccountIds: string[];
  setSelectedAccountIds: (selectedAccountIds: string[]) => void;
};

export function AccountSelector({
  accounts,
  selectedAccountIds,
  setSelectedAccountIds,
}: AccountSelectorProps) {
  const { t } = useTranslation();
  const [uncheckedHidden, setUncheckedHidden] = useState(false);

  // Group accounts by on-budget, off-budget, and closed
  const groupedAccounts = useMemo(() => {
    const onBudget = accounts.filter(
      account => !account.offbudget && !account.closed,
    );
    const offBudget = accounts.filter(
      account => account.offbudget && !account.closed,
    );
    const closed = accounts.filter(account => account.closed);
    return { onBudget, offBudget, closed };
  }, [accounts]);

  const selectedAccountMap = useMemo(
    () => new Set(selectedAccountIds),
    [selectedAccountIds],
  );

  // Calculate selection states for each group
  const onBudgetSelected = groupedAccounts.onBudget.every(account =>
    selectedAccountMap.has(account.id),
  );
  const offBudgetSelected = groupedAccounts.offBudget.every(account =>
    selectedAccountMap.has(account.id),
  );
  const closedSelected = groupedAccounts.closed.every(account =>
    selectedAccountMap.has(account.id),
  );

  const allAccountsSelected =
    onBudgetSelected && offBudgetSelected && closedSelected;
  const allAccountsUnselected = !selectedAccountIds.length;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 5,
          flexShrink: 0,
        }}
      >
        <Button
          variant="bare"
          onPress={() => setUncheckedHidden(state => !state)}
          style={{ padding: 8 }}
        >
          <View>
            {uncheckedHidden ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SvgViewShow
                  width={15}
                  height={15}
                  style={{ marginRight: 5 }}
                />
                <Text>
                  <Trans>Show unchecked</Trans>
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <SvgViewHide
                  width={15}
                  height={15}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={{
                    maxWidth: 100,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <Trans>Hide unchecked</Trans>
                </Text>
              </View>
            )}
          </View>
        </Button>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <GraphButton
            selected={allAccountsSelected}
            title={t('Select All')}
            onSelect={() => {
              setSelectedAccountIds(accounts.map(account => account.id));
            }}
            style={{ marginRight: 5, padding: 8 }}
          >
            <SvgCheckAll width={15} height={15} />
          </GraphButton>
          <GraphButton
            selected={allAccountsUnselected}
            title={t('Unselect All')}
            onSelect={() => {
              setSelectedAccountIds([]);
            }}
            style={{ padding: 8 }}
          >
            <SvgUncheckAll width={15} height={15} />
          </GraphButton>
        </View>
      </View>

      <ul
        style={{
          listStyle: 'none',
          marginLeft: 0,
          paddingLeft: 0,
          paddingRight: 10,
          flexGrow: 1,
          overflowY: 'auto',
        }}
      >
        {/* On Budget Accounts */}
        {groupedAccounts.onBudget.length > 0 && (
          <>
            <li
              style={{
                display: !onBudgetSelected && uncheckedHidden ? 'none' : 'flex',
                flexDirection: 'row',
                marginBottom: 8,
                marginTop: 8,
              }}
            >
              <Checkbox
                id="onbudget_group"
                checked={onBudgetSelected}
                onChange={() => {
                  const onBudgetAccountIds = groupedAccounts.onBudget.map(
                    account => account.id,
                  );
                  const allOnBudgetSelected = onBudgetAccountIds.every(id =>
                    selectedAccountIds.includes(id),
                  );

                  if (allOnBudgetSelected) {
                    // Deselect all on-budget accounts
                    setSelectedAccountIds(
                      selectedAccountIds.filter(
                        id => !onBudgetAccountIds.includes(id),
                      ),
                    );
                  } else {
                    // Select all on-budget accounts
                    const newSelection = [...selectedAccountIds];
                    onBudgetAccountIds.forEach(id => {
                      if (!newSelection.includes(id)) {
                        newSelection.push(id);
                      }
                    });
                    setSelectedAccountIds(newSelection);
                  }
                }}
              />
              <label
                htmlFor="onbudget_group"
                style={{ userSelect: 'none', fontWeight: 'bold' }}
              >
                <Trans>On Budget</Trans>
              </label>
            </li>
            {groupedAccounts.onBudget.map(account => {
              const isChecked = selectedAccountMap.has(account.id);
              return (
                <li
                  key={account.id}
                  style={{
                    display: !isChecked && uncheckedHidden ? 'none' : 'flex',
                    flexDirection: 'row',
                    marginBottom: 4,
                    marginLeft: 16,
                  }}
                >
                  <Checkbox
                    id={`account_${account.id}`}
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedAccountIds(
                          selectedAccountIds.filter(id => id !== account.id),
                        );
                      } else {
                        setSelectedAccountIds([
                          ...selectedAccountIds,
                          account.id,
                        ]);
                      }
                    }}
                  />
                  <label
                    htmlFor={`account_${account.id}`}
                    style={{ userSelect: 'none' }}
                  >
                    {account.name}
                  </label>
                </li>
              );
            })}
          </>
        )}

        {/* Off Budget Accounts */}
        {groupedAccounts.offBudget.length > 0 && (
          <>
            <li
              style={{
                display:
                  !offBudgetSelected && uncheckedHidden ? 'none' : 'flex',
                flexDirection: 'row',
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              <Checkbox
                id="offbudget_group"
                checked={offBudgetSelected}
                onChange={() => {
                  const offBudgetAccountIds = groupedAccounts.offBudget.map(
                    account => account.id,
                  );
                  const allOffBudgetSelected = offBudgetAccountIds.every(id =>
                    selectedAccountIds.includes(id),
                  );

                  if (allOffBudgetSelected) {
                    // Deselect all off-budget accounts
                    setSelectedAccountIds(
                      selectedAccountIds.filter(
                        id => !offBudgetAccountIds.includes(id),
                      ),
                    );
                  } else {
                    // Select all off-budget accounts
                    const newSelection = [...selectedAccountIds];
                    offBudgetAccountIds.forEach(id => {
                      if (!newSelection.includes(id)) {
                        newSelection.push(id);
                      }
                    });
                    setSelectedAccountIds(newSelection);
                  }
                }}
              />
              <label
                htmlFor="offbudget_group"
                style={{ userSelect: 'none', fontWeight: 'bold' }}
              >
                <Trans>Off Budget</Trans>
              </label>
            </li>
            {groupedAccounts.offBudget.map(account => {
              const isChecked = selectedAccountMap.has(account.id);
              return (
                <li
                  key={account.id}
                  style={{
                    display: !isChecked && uncheckedHidden ? 'none' : 'flex',
                    flexDirection: 'row',
                    marginBottom: 4,
                    marginLeft: 16,
                  }}
                >
                  <Checkbox
                    id={`account_${account.id}`}
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedAccountIds(
                          selectedAccountIds.filter(id => id !== account.id),
                        );
                      } else {
                        setSelectedAccountIds([
                          ...selectedAccountIds,
                          account.id,
                        ]);
                      }
                    }}
                  />
                  <label
                    htmlFor={`account_${account.id}`}
                    style={{ userSelect: 'none' }}
                  >
                    {account.name}
                  </label>
                </li>
              );
            })}
          </>
        )}

        {/* Closed Accounts */}
        {groupedAccounts.closed.length > 0 && (
          <>
            <li
              style={{
                display: !closedSelected && uncheckedHidden ? 'none' : 'flex',
                flexDirection: 'row',
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              <Checkbox
                id="closed_group"
                checked={closedSelected}
                onChange={() => {
                  const closedAccountIds = groupedAccounts.closed.map(
                    account => account.id,
                  );
                  const allClosedSelected = closedAccountIds.every(id =>
                    selectedAccountIds.includes(id),
                  );

                  if (allClosedSelected) {
                    // Deselect all closed accounts
                    setSelectedAccountIds(
                      selectedAccountIds.filter(
                        id => !closedAccountIds.includes(id),
                      ),
                    );
                  } else {
                    // Select all closed accounts
                    const newSelection = [...selectedAccountIds];
                    closedAccountIds.forEach(id => {
                      if (!newSelection.includes(id)) {
                        newSelection.push(id);
                      }
                    });
                    setSelectedAccountIds(newSelection);
                  }
                }}
              />
              <label
                htmlFor="closed_group"
                style={{ userSelect: 'none', fontWeight: 'bold' }}
              >
                <Trans>Closed</Trans>
              </label>
            </li>
            {groupedAccounts.closed.map(account => {
              const isChecked = selectedAccountMap.has(account.id);
              return (
                <li
                  key={account.id}
                  style={{
                    display: !isChecked && uncheckedHidden ? 'none' : 'flex',
                    flexDirection: 'row',
                    marginBottom: 4,
                    marginLeft: 16,
                  }}
                >
                  <Checkbox
                    id={`account_${account.id}`}
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedAccountIds(
                          selectedAccountIds.filter(id => id !== account.id),
                        );
                      } else {
                        setSelectedAccountIds([
                          ...selectedAccountIds,
                          account.id,
                        ]);
                      }
                    }}
                  />
                  <label
                    htmlFor={`account_${account.id}`}
                    style={{ userSelect: 'none' }}
                  >
                    {account.name}
                  </label>
                </li>
              );
            })}
          </>
        )}
      </ul>
    </View>
  );
}
