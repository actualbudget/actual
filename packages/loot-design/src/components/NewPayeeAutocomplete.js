import React, { useState, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import Select, { components as SelectComponents } from 'react-select';

import Creatable from 'react-select/creatable';

import { createPayee } from 'loot-core/src/client/actions/queries';
import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import { getActivePayees } from 'loot-core/src/client/reducers/queries';

import { colors } from '../style';
import Add from '../svg/v1/Add';

import { AutocompleteFooter, AutocompleteFooterButton } from './Autocomplete';
import styles from './autocomplete-styles';
import { View, NullComponent } from './common';

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
  focused = false,
  showMakeTransfer = true,
  showManagePayees = false,
  defaultFocusTransferPayees = false,
  embedded = false,
  multi = false,
  isCreatable = false,
  onSelect,
  onManagePayees,
  ...props
}) {
  const selectRef = useRef();
  const [initialValue] = useState(value);
  const [isOpen, setIsOpen] = useState(focused);
  const [inputValue, setInputValue] = useState();
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

  const onChange = async selected => {
    // Clear button clicked
    if (!selected) {
      onSelect(null);
      return;
    }

    // Close the menu when making a successful selection
    if (!Array.isArray(selected)) {
      setIsOpen(false);
    }

    const existingOption = allOptions.find(option =>
      filterOption(option, selected.label),
    );
    if (selected.__isNew__) {
      // Prevent creating duplicates
      if (existingOption) {
        onSelect(existingOption.value);
        return;
      }

      // This is actually a new payee, so create it
      onSelect(await dispatch(createPayee(selected.value)));
      return;
    }

    // Multi-select has multiple selections
    if (Array.isArray(selected)) {
      onSelect(selected.map(option => option.value));
      return;
    }

    onSelect(selected.value);
  };

  const filterOption = (option, input) => {
    return (
      option.data?.__isNew__ ||
      option.label.toLowerCase().includes(input?.toLowerCase())
    );
  };

  const onKeyDown = event => {
    const ESC = 27;

    if (event.keyCode === ESC) {
      onSelect(initialValue);
      setIsOpen(false);
      return;
    }

    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const useCreatableComponent = isCreatable && focusTransferPayees === false;
  const Component = useCreatableComponent ? Creatable : Select;

  return (
    <Component
      ref={selectRef}
      menuIsOpen={isOpen || embedded}
      autoFocus={embedded}
      options={options}
      value={
        multi
          ? allOptions.filter(item => value.includes(item.value))
          : allOptions.find(item => item.value === value)
      }
      inputValue={inputValue}
      placeholder="(none)"
      captureMenuScroll={false}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onInputChange={setInputValue}
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
      isClearable
      filterOption={filterOption}
      components={{
        MenuList: MenuListWithFooter,
        IndicatorSeparator: NullComponent,
        DropdownIndicator: NullComponent,
      }}
      maxMenuHeight={200}
      styles={styles}
      embedded={embedded}
      isMulti={multi}
      menuPlacement="auto"
      menuPortalTarget={embedded ? undefined : document.body}
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
