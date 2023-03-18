import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { components as SelectComponents } from 'react-select';

import { createPayee } from 'loot-core/src/client/actions/queries';
import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import { getActivePayees } from 'loot-core/src/client/reducers/queries';

import { colors } from '../style';
import Add from '../svg/v1/Add';

import { AutocompleteFooter, AutocompleteFooterButton } from './Autocomplete';
import { View } from './common';
import Autocomplete from './NewAutocomplete';

function getPayeeSuggestions(payees, focusTransferPayees, accounts) {
  let activePayees =
    (accounts ? getActivePayees(payees, accounts) : payees) || [];

  function formatOptions(options) {
    return options.map(row => ({
      value: row.id,
      label: row.name,
    }));
  }

  return [
    ...(focusTransferPayees
      ? []
      : [
          {
            label: 'Payees',
            options: formatOptions(activePayees.filter(p => !p.transfer_acct)),
          },
        ]),
    {
      label: 'Transfer To/From',
      options: formatOptions(activePayees.filter(p => p.transfer_acct)),
    },
  ];
}

function MenuListWithFooter(props) {
  return (
    <>
      <SelectComponents.MenuList {...props} />
      {props.selectProps.footer}
    </>
  );
}

export default function PayeeAutocomplete({
  value,
  multi = false,
  showMakeTransfer = true,
  showManagePayees = false,
  defaultFocusTransferPayees = false,
  isCreatable = false,
  onSelect,
  onManagePayees,
  ...props
}) {
  const payees = useCachedPayees();
  const accounts = useCachedAccounts();

  const [focusTransferPayees, setFocusTransferPayees] = useState(
    defaultFocusTransferPayees,
  );
  const options = useMemo(
    () => getPayeeSuggestions(payees, focusTransferPayees, accounts),
    [payees, focusTransferPayees, accounts],
  );
  const allOptions = useMemo(
    () => options.reduce((carry, { options }) => [...carry, ...options], []),
    [options],
  );

  const dispatch = useDispatch();

  const useCreatableComponent = isCreatable && focusTransferPayees === false;
  const [inputValue, setInputValue] = useState();

  return (
    <Autocomplete
      options={options}
      value={
        multi
          ? allOptions.filter(item => value.includes(item.value))
          : allOptions.find(item => item.value === value)
      }
      isMulti={multi}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelect={onSelect}
      onCreateOption={async selectedValue => {
        const existingOption = allOptions.find(option =>
          option.label.toLowerCase().includes(selectedValue?.toLowerCase()),
        );

        // Prevent creating duplicates
        if (existingOption) {
          onSelect(existingOption.value);
          return;
        }

        // This is actually a new option, so create it
        onSelect(await dispatch(createPayee(selectedValue)));
      }}
      isCreatable={useCreatableComponent}
      createOptionPosition="first"
      formatCreateLabel={inputValue => (
        <View
          style={{
            display: 'block',
            color: colors.g8,
            fontSize: 11,
            fontWeight: 500,
            marginLeft: -10,
            padding: '4px 0',
          }}
        >
          <Add
            width={8}
            height={8}
            style={{
              color: colors.g8,
              marginRight: 5,
              display: 'inline-block',
            }}
          />
          Create Payee "{inputValue}"
        </View>
      )}
      components={{
        MenuList: MenuListWithFooter,
      }}
      footer={
        <AutocompleteFooter show={showMakeTransfer || showManagePayees}>
          {showMakeTransfer && (
            <AutocompleteFooterButton
              title="Make Transfer"
              style={[
                showManagePayees && { marginBottom: 5 },
                focusTransferPayees && {
                  backgroundColor: colors.y8,
                  color: colors.g2,
                  borderColor: colors.y8,
                },
              ]}
              hoveredStyle={
                focusTransferPayees && {
                  backgroundColor: colors.y8,
                  colors: colors.y2,
                }
              }
              onClick={() => {
                setInputValue('');
                setFocusTransferPayees(!focusTransferPayees);
              }}
            />
          )}
          {showManagePayees && (
            <AutocompleteFooterButton
              title="Manage Payees"
              onClick={onManagePayees}
            />
          )}
        </AutocompleteFooter>
      }
      {...props}
    />
  );
}
