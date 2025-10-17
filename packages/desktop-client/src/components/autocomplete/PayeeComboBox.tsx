import { type ComponentProps, useMemo, useState } from 'react';
import { Header, type Key } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { ComboBox, ComboBoxInputProvider, ComboBoxItem, ComboBoxSection } from '@actual-app/components/combo-box';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';

import {
  normalisedEquals,
  normalisedIncludes,
} from 'loot-core/shared/normalisation';
import { type AccountEntity, type PayeeEntity } from 'loot-core/types/models';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCommonPayees, usePayees } from '@desktop-client/hooks/usePayees';
import { usePrevious } from '@desktop-client/hooks/usePrevious';
import {
  createPayee,
  getActivePayees,
} from '@desktop-client/payees/payeesSlice';
import { useDispatch } from '@desktop-client/redux';

type PayeeComboBoxItem = PayeeEntity & {
  type: 'account' | 'payee' | 'suggested';
};

type PayeeComboBoxProps = Omit<
  ComponentProps<typeof ComboBox>,
  'children'
> & {
  showInactive?: boolean;
};

export function PayeeComboBox({
  showInactive,
  selectedKey,
  onOpenChange,
  onSelectionChange,
  ...props
}: PayeeComboBoxProps) {
  const { t } = useTranslation();
  const payees = usePayees();
  const commonPayees = useCommonPayees();
  const accounts = useAccounts();
  const [focusTransferPayees] = useState(false);

  const allPayeeSuggestions: PayeeComboBoxItem[] = useMemo(() => {
    const suggestions = getPayeeSuggestions(commonPayees, payees);

    let filteredSuggestions: PayeeComboBoxItem[] = [...suggestions];

    if (!showInactive) {
      filteredSuggestions = filterActivePayees(filteredSuggestions, accounts);
    }

    if (focusTransferPayees) {
      filteredSuggestions = filterTransferPayees(filteredSuggestions);
    }

    return filteredSuggestions;
  }, [commonPayees, payees, showInactive, focusTransferPayees, accounts]);

  const [inputValue, setInputValue] = useState(
    getPayeeName(allPayeeSuggestions, selectedKey || null),
  );
  const [_selectedKey, setSelectedKey] = useState<Key | null>(
    selectedKey || null,
  );

  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const previousIsAutocompeleteOpen = usePrevious(isAutocompleteOpen);
  const isInitialAutocompleteOpen =
    !previousIsAutocompeleteOpen && isAutocompleteOpen;

  const filter = (textValue: string, inputValue: string) => {
    return (
      isInitialAutocompleteOpen || normalisedIncludes(textValue, inputValue)
    );
  };

  const filteredPayeeSuggestions = allPayeeSuggestions.filter(p =>
    filter(p.name, inputValue),
  );

  const suggestedPayees = filteredPayeeSuggestions.filter(
    p => p.type === 'suggested',
  );
  const regularPayees = filteredPayeeSuggestions.filter(
    p => !p.favorite && p.type === 'payee',
  );
  const accountPayees = filteredPayeeSuggestions.filter(
    p => p.type === 'account',
  );

  const findExactMatchPayee = () =>
    filteredPayeeSuggestions.find(
      p => p.id !== 'new' && normalisedEquals(p.name, inputValue),
    );

  const exactMatchPayee = findExactMatchPayee();

  const dispatch = useDispatch();
  const onCreatePayee = () => {
    return dispatch(createPayee({ name: inputValue })).unwrap();
  };

  const _onSelectionChange = async (id: Key | null) => {
    if (id === 'new') {
      const newPayeeId = await onCreatePayee?.();
      setSelectedKey(newPayeeId);
      onSelectionChange?.(newPayeeId);
      return;
    }

    setSelectedKey(id);
    setInputValue(getPayeeName(filteredPayeeSuggestions, id));
    onSelectionChange?.(id);
  };

  const _onOpenChange = (isOpen: boolean) => {
    setIsAutocompleteOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  const getFocusedKey: ComponentProps<
    typeof ComboBoxInputProvider
  >['getFocusedKey'] = state => {
    const keys = Array.from(state.collection.getKeys());
    const found = keys
      .map(key => state.collection.getItem(key))
      .find(i => i && i.type === 'item' && i.key !== 'new');

    // Focus on the first suggestion item when typing.
    // Otherwise, if there are no results, focus on the "new" item to allow creating a new entry.
    return found?.key || 'new';
  };

  return (
    <ComboBoxInputProvider getFocusedKey={getFocusedKey}>
      <ComboBox
        aria-label={t('Payee autocomplete')}
        inputPlaceholder="nothing"
        inputValue={inputValue}
        onInputChange={setInputValue}
        selectedKey={_selectedKey || selectedKey}
        onSelectionChange={_onSelectionChange}
        onOpenChange={_onOpenChange}
        {...props}
      >
        <PayeeList
          showCreatePayee={!!inputValue && !exactMatchPayee}
          inputValue={inputValue}
          suggestedPayees={suggestedPayees}
          regularPayees={regularPayees}
          accountPayees={accountPayees}
        />

        {/* <ComboBoxSection className={css({ position: 'sticky', bottom: 0, })}>
          <Button variant="menu" slot={null}>
            <Trans>Make transfer</Trans>
          </Button>
          <Button variant="menu" slot={null}>
            <Trans>Manage payees</Trans>
          </Button>
        </ComboBoxSection> */}
      </ComboBox>
    </ComboBoxInputProvider>
  );
}

type PayeeListProps = {
  showCreatePayee: boolean;
  inputValue: string;
  suggestedPayees: PayeeComboBoxItem[];
  regularPayees: PayeeComboBoxItem[];
  accountPayees: PayeeComboBoxItem[];
};

function PayeeList({
  showCreatePayee,
  inputValue,
  suggestedPayees,
  regularPayees,
  accountPayees,
}: PayeeListProps) {
  return (
    <>
      {showCreatePayee && (
        <ComboBoxItem
          key="new"
          id="new"
          textValue={inputValue}
          style={{ paddingLeft: 10, color: theme.noticeText }}
        >
          <SvgAdd width={8} height={8} style={{ marginRight: 5 }} />
          Create payee: {inputValue}
        </ComboBoxItem>
      )}

      {suggestedPayees.length > 0 && (
        <ComboBoxSection>
          <Header>
            <Trans>Suggested Payees</Trans>
          </Header>
          {suggestedPayees.map(payee => (
            <ComboBoxItem
              key={payee.id}
              id={payee.id}
              textValue={payee.name}
              value={payee}
            >
              {payee.name}
            </ComboBoxItem>
          ))}
        </ComboBoxSection>
      )}

      {regularPayees.length > 0 && (
        <ComboBoxSection>
          <Header>
            <Trans>Payees</Trans>
          </Header>
          {regularPayees.map(payee => (
            <ComboBoxItem
              key={payee.id}
              id={payee.id}
              textValue={payee.name}
              value={payee}
            >
              {payee.name}
            </ComboBoxItem>
          ))}
        </ComboBoxSection>
      )}

      {accountPayees.length > 0 && (
        <ComboBoxSection>
          <Header>
            <Trans>Transfer To/From</Trans>
          </Header>
          {accountPayees.map(payee => (
            <ComboBoxItem
              key={payee.id}
              id={payee.id}
              textValue={payee.name}
              value={payee}
            >
              {payee.name}
            </ComboBoxItem>
          ))}
        </ComboBoxSection>
      )}
    </>
  );
}

const MAX_AUTO_SUGGESTIONS = 5;

function getPayeeSuggestions(
  commonPayees: PayeeEntity[],
  payees: PayeeEntity[],
): PayeeComboBoxItem[] {
  const favoritePayees = payees
    .filter(p => p.favorite)
    .map(p => {
      return { ...p, type: determineType(p, true) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let additionalCommonPayees: PayeeComboBoxItem[] = [];
  if (commonPayees?.length > 0) {
    if (favoritePayees.length < MAX_AUTO_SUGGESTIONS) {
      additionalCommonPayees = commonPayees
        .filter(
          p => !(p.favorite || favoritePayees.map(fp => fp.id).includes(p.id)),
        )
        .slice(0, MAX_AUTO_SUGGESTIONS - favoritePayees.length)
        .map(p => {
          return { ...p, type: determineType(p, true) };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  if (favoritePayees.length + additionalCommonPayees.length) {
    const filteredPayees: PayeeComboBoxItem[] = payees
      .filter(p => !favoritePayees.find(fp => fp.id === p.id))
      .filter(p => !additionalCommonPayees.find(fp => fp.id === p.id))
      .map<PayeeComboBoxItem>(p => {
        return { ...p, type: determineType(p, false) };
      });

    return favoritePayees.concat(additionalCommonPayees).concat(filteredPayees);
  }

  return payees.map(p => {
    return { ...p, type: determineType(p, false) };
  });
}

function filterActivePayees<T extends PayeeEntity>(
  payees: T[],
  accounts: AccountEntity[],
): T[] {
  return accounts ? (getActivePayees(payees, accounts) as T[]) : payees;
}

function filterTransferPayees(payees: PayeeComboBoxItem[]) {
  return payees.filter(payee => !!payee.transfer_acct);
}

function determineType(
  payee: PayeeEntity,
  isCommon: boolean,
): PayeeComboBoxItem['type'] {
  if (payee.transfer_acct) {
    return 'account';
  }
  if (isCommon) {
    return 'suggested';
  } else {
    return 'payee';
  }
}

function getPayeeName<T extends PayeeEntity>(items: T[], id: Key | null) {
  return items.find(p => p.id === id)?.name || '';
}
