import React from 'react';
import { connect } from 'react-redux';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import * as actions from 'loot-core/src/client/actions';
import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';

import { colors } from '../../style';
import AccountAutocomplete from '../AccountAutocomplete';
import CategoryAutocomplete from '../CategorySelect';
import { View, Modal, Input } from '../common';
import DateSelect from '../DateSelect';
import { SectionLabel } from '../forms';
import PayeeAutocomplete from '../PayeeAutocomplete';
// import { colors } from '../../style';

function EditField({
  actions,
  modalProps,
  name,
  accounts,
  categoryGroups,
  payees,
  onSubmit,
  dateFormat,
  createPayee
}) {
  function onSelect(value) {
    // Process the value if needed
    if (name === 'amount') {
      value = amountToInteger(value);
    }

    onSubmit(name, value);
    modalProps.onClose();
  }

  let label, editor, minWidth;
  let inputStyle = { ':focus': { boxShadow: 0 } };
  let autocompleteProps = {
    inputProps: { style: inputStyle },
    containerProps: { style: { height: 275 } }
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
          color: 'white'
        },
        minWidth && { minWidth }
      ]}
    >
      {() => (
        <View>
          <SectionLabel
            title={label}
            style={{
              alignSelf: 'center',
              color: colors.b10,
              marginBottom: 10
            }}
          />
          <View style={{ flex: 1 }}>{editor}</View>
        </View>
      )}
    </Modal>
  );
}

export default connect(
  state => ({
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    categoryGroups: state.queries.categories.grouped,
    accounts: state.queries.accounts,
    payees: state.queries.payees
  }),
  actions
)(EditField);
