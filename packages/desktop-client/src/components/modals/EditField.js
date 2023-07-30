import React from 'react';
import { useSelector } from 'react-redux';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useActions } from '../../hooks/useActions';
import { colors } from '../../style';
import AccountAutocomplete from '../autocomplete/AccountAutocomplete';
import CategoryAutocomplete from '../autocomplete/CategorySelect';
import PayeeAutocomplete from '../autocomplete/PayeeAutocomplete';
import Input from '../common/Input';
import Modal from '../common/Modal';
import View from '../common/View';
import { SectionLabel } from '../forms';
import DateSelect from '../select/DateSelect';

export default function EditField({ modalProps, name, onSubmit }) {
  let dateFormat = useSelector(
    state => state.prefs.local.dateFormat || 'MM/dd/yyyy',
  );
  let categoryGroups = useSelector(state => state.queries.categories.grouped);
  let accounts = useSelector(state => state.queries.accounts);
  let payees = useSelector(state => state.queries.payees);

  let { createPayee } = useActions();

  function onSelect(value) {
    if (value != null) {
      // Process the value if needed
      if (name === 'amount') {
        value = amountToInteger(value);
      }

      onSubmit(name, value);
    }
    modalProps.onClose();
  }

  let label, editor, minWidth;
  let inputStyle = { ':focus': { boxShadow: 0 } };
  let autocompleteProps = {
    inputProps: { style: inputStyle },
    containerProps: { style: { height: 275 } },
  };

  switch (name) {
    case 'date': {
      let today = currentDay();
      label = 'Date';
      minWidth = 350;
      editor = (
        <DateSelect
          value={formatDate(parseISO(today), dateFormat)}
          dateFormat={dateFormat}
          focused={true}
          embedded={true}
          onUpdate={() => {}}
          onSelect={date => {
            onSelect(dayFromDate(parseDate(date, 'yyyy-MM-dd', new Date())));
          }}
        />
      );
      break;
    }

    case 'account':
      label = 'Account';
      editor = (
        <AccountAutocomplete
          value={null}
          accounts={accounts}
          focused={true}
          embedded={true}
          onSelect={value => {
            if (value) {
              onSelect(value);
            }
          }}
          {...autocompleteProps}
        />
      );
      break;

    case 'payee':
      label = 'Payee';
      editor = (
        <PayeeAutocomplete
          payees={payees}
          accounts={accounts}
          value={null}
          focused={true}
          embedded={true}
          showManagePayees={false}
          onSelect={async value => {
            if (value && value.startsWith('new:')) {
              value = await createPayee(value.slice('new:'.length));
            }

            onSelect(value);
          }}
          isCreatable
          {...autocompleteProps}
        />
      );
      break;

    case 'notes':
      label = 'Notes';
      editor = (
        <Input
          focused={true}
          onEnter={e => onSelect(e.target.value)}
          style={inputStyle}
        />
      );
      break;

    case 'category':
      label = 'Category';
      editor = (
        <CategoryAutocomplete
          categoryGroups={categoryGroups}
          value={null}
          focused={true}
          embedded={true}
          showSplitOption={false}
          onUpdate={() => {}}
          onSelect={value => {
            onSelect(value);
          }}
          {...autocompleteProps}
        />
      );
      break;

    case 'amount':
      label = 'Amount';
      editor = (
        <Input
          focused={true}
          onEnter={e => onSelect(e.target.value)}
          style={inputStyle}
        />
      );
      break;

    default:
  }

  return (
    <Modal
      noAnimation={true}
      showHeader={false}
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={[
        {
          flex: 0,
          padding: '15px 10px',
          backgroundColor: colors.n1,
          color: 'white',
        },
        minWidth && { minWidth },
      ]}
    >
      {() => (
        <View>
          <SectionLabel
            title={label}
            style={{
              alignSelf: 'center',
              color: colors.b10,
              marginBottom: 10,
            }}
          />
          <View style={{ flex: 1 }}>{editor}</View>
        </View>
      )}
    </Modal>
  );
}
