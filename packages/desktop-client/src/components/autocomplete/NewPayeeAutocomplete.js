import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { components as SelectComponents } from 'react-select';

import { createPayee } from 'loot-core/src/client/actions/queries';
import { getActivePayees } from 'loot-core/src/client/reducers/queries';

import Add from '../../icons/v1/Add';
import { colors } from '../../style';
import { View } from '../common';

import { AutocompleteFooter, AutocompleteFooterButton } from './Autocomplete';
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
  payees,
  accounts,
  value,
  multi = false,
  showMakeTransfer = true,
  showManagePayees = false,
  defaultFocusTransferPayees = false,
  onSelect,
  onManagePayees,
  ...props
}) {
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

  return (
    <Autocomplete
      options={options}
      value={
        multi
          ? allOptions.filter(item => value.includes(item.value))
          : allOptions.find(item => item.value === value)
      }
      isValidNewOption={input => {
        if (focusTransferPayees || !input) {
          return false;
        }

        const lowercaseInput = input.toLowerCase();
        const hasExistingOption = allOptions.some(
          option => option.label.toLowerCase() === lowercaseInput,
        );

        return !hasExistingOption;
      }}
      isMulti={multi}
      onSelect={onSelect}
      onCreateOption={async selectedValue => {
        onSelect(await dispatch(createPayee(selectedValue)));
      }}
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
          Create Payee “{inputValue}”
        </View>
      )}
      components={{
        MenuList: MenuListWithFooter,
      }}
      minMenuHeight={300}
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
