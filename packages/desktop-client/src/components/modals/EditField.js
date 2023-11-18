import React from 'react';
import { useSelector } from 'react-redux';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useActions } from '../../hooks/useActions';
import useCategories from '../../hooks/useCategories';
import { Add } from '../../icons/v1';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import AccountAutocomplete, {
  AccountGroupHeader,
  AccountItem,
} from '../autocomplete/AccountAutocomplete';
import CategoryAutocomplete, {
  CategoryGroupHeader,
  CategoryItem,
} from '../autocomplete/CategoryAutocomplete';
import PayeeAutocomplete, {
  CreatePayeeButton,
  PayeeGroupHeader,
  PayeeItem,
} from '../autocomplete/PayeeAutocomplete';
import Input from '../common/Input';
import Modal from '../common/Modal';
import View from '../common/View';
import { SectionLabel } from '../forms';
import DateSelect from '../select/DateSelect';

function CreatePayeeIcon(props) {
  return <Add {...props} width={12} height={12} />;
}

export default function EditField({ modalProps, name, onSubmit }) {
  let dateFormat = useSelector(
    state => state.prefs.local.dateFormat || 'MM/dd/yyyy',
  );
  let { grouped: categoryGroups } = useCategories();
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

  const { isNarrowWidth } = useResponsive();
  let label, editor, minWidth;
  let inputStyle = {
    ':focus': { boxShadow: 0 },
    ...(isNarrowWidth && { fontSize: 25 }),
  };
  let autocompleteProps = {
    inputProps: { style: inputStyle },
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
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
          closeOnBlur={false}
          onSelect={value => {
            if (value) {
              onSelect(value);
            }
          }}
          renderGroupHeader={props => (
            <AccountGroupHeader
              {...props}
              style={{
                ...styles.largeText,
                color: theme.tableHeaderText,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
          )}
          renderAccountItem={props => (
            <AccountItem
              {...props}
              style={{
                ...styles.largeText,
                fontWeight: 450,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 0,
                borderTop: `1px solid ${theme.pillBorder}`,
              }}
            />
          )}
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
          closeOnBlur={false}
          showManagePayees={false}
          showMakeTransfer={!isNarrowWidth}
          onSelect={async value => {
            if (value && value.startsWith('new:')) {
              value = await createPayee(value.slice('new:'.length));
            }

            onSelect(value);
          }}
          isCreatable
          renderGroupHeader={props => (
            <PayeeGroupHeader
              {...props}
              style={{
                ...styles.largeText,
                color: theme.tableHeaderText,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
          )}
          renderCreatePayeeButton={props => (
            <CreatePayeeButton
              {...props}
              Icon={CreatePayeeIcon}
              style={{
                ...styles.largeText,
                fontWeight: 450,
                paddingTop: 5,
                paddingBottom: 5,
              }}
            />
          )}
          renderPayeeItem={props => (
            <PayeeItem
              {...props}
              style={{
                ...styles.largeText,
                fontWeight: 450,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 0,
                borderTop: `1px solid ${theme.pillBorder}`,
              }}
            />
          )}
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
          closeOnBlur={false}
          showSplitOption={false}
          onUpdate={() => {}}
          onSelect={value => {
            onSelect(value);
          }}
          renderGroupHeader={props => (
            <CategoryGroupHeader
              {...props}
              style={{
                ...styles.largeText,
                color: theme.tableHeaderText,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
          )}
          renderCategoryItem={props => (
            <CategoryItem
              {...props}
              style={{
                ...styles.largeText,
                fontWeight: 450,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 0,
                borderTop: `1px solid ${theme.pillBorder}`,
              }}
            />
          )}
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
      title={label}
      noAnimation={!isNarrowWidth}
      showHeader={isNarrowWidth}
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 0,
        height: isNarrowWidth ? '85vh' : 275,
        padding: '15px 10px',
        borderRadius: '6px',
        ...(minWidth && { minWidth }),
        ...(!isNarrowWidth && {
          backgroundColor: theme.mobileModalBackground,
          color: theme.mobileModalText,
        }),
      }}
    >
      {() => (
        <View>
          {!isNarrowWidth && (
            <SectionLabel
              title={label}
              style={{
                alignSelf: 'center',
                color: theme.mobileModalText,
                marginBottom: 10,
              }}
            />
          )}
          <View style={{ flex: 1 }}>{editor}</View>
        </View>
      )}
    </Modal>
  );
}
