import React, { useState } from 'react';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useAccounts } from '../../hooks/useAccounts';
import { useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePayees } from '../../hooks/usePayees';
import { SvgAdd } from '../../icons/v1';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import {
  AccountAutocomplete,
  AccountItem,
} from '../autocomplete/AccountAutocomplete';
import {
  CategoryAutocomplete,
  CategoryItem,
} from '../autocomplete/CategoryAutocomplete';
import { ItemHeader } from '../autocomplete/ItemHeader';
import {
  PayeeAutocomplete,
  CreatePayeeButton,
  PayeeItem,
} from '../autocomplete/PayeeAutocomplete';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { DateSelect } from '../select/DateSelect';

function CreatePayeeIcon(props) {
  return <SvgAdd {...props} width={14} height={14} />;
}

export function EditField({ modalProps, name, onSubmit, onClose }) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { grouped: categoryGroups } = useCategories();
  const accounts = useAccounts();
  const payees = usePayees();

  const { createPayee } = useActions();
  const onCloseInner = () => {
    modalProps.onClose();
    onClose?.();
  };

  function onSelectNote(value, mode) {
    if (value != null) {
      onSubmit(name, value, mode);
    }
    onCloseInner();
  }

  function onSelect(value) {
    if (value != null) {
      // Process the value if needed
      if (name === 'amount') {
        value = amountToInteger(value);
      }

      onSubmit(name, value);
    }
    onCloseInner();
  }

  const itemStyle = {
    fontSize: 17,
    fontWeight: 400,
    paddingTop: 8,
    paddingBottom: 8,
  };

  const { isNarrowWidth } = useResponsive();
  let label, editor, minWidth;
  const inputStyle = {
    ':focus': { boxShadow: 0 },
    ...(isNarrowWidth && itemStyle),
  };
  const autocompleteProps = {
    inputProps: { style: inputStyle },
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  const [noteAmend, onChangeMode] = useState('replace');

  switch (name) {
    case 'date': {
      const today = currentDay();
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
          {...(isNarrowWidth && {
            renderAccountItemGroupHeader: props => (
              <ItemHeader
                {...props}
                style={{
                  ...styles.largeText,
                  color: theme.menuItemTextHeader,
                  paddingTop: 10,
                  paddingBottom: 10,
                }}
              />
            ),
            renderAccountItem: props => (
              <AccountItem
                {...props}
                style={{
                  ...itemStyle,
                  color: theme.menuItemText,
                  borderRadius: 0,
                  borderTop: `1px solid ${theme.pillBorder}`,
                }}
              />
            ),
          })}
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
          {...(isNarrowWidth && {
            renderCreatePayeeButton: props => (
              <CreatePayeeButton
                {...props}
                Icon={CreatePayeeIcon}
                style={itemStyle}
              />
            ),
            renderPayeeItemGroupHeader: props => (
              <ItemHeader
                {...props}
                style={{
                  ...styles.largeText,
                  color: theme.menuItemTextHeader,
                  paddingTop: 10,
                  paddingBottom: 10,
                }}
              />
            ),
            renderPayeeItem: props => (
              <PayeeItem
                {...props}
                style={{
                  ...itemStyle,
                  color: theme.menuItemText,
                  borderRadius: 0,
                  borderTop: `1px solid ${theme.pillBorder}`,
                }}
              />
            ),
          })}
          {...autocompleteProps}
        />
      );
      break;

    case 'notes':
      label = 'Notes';
      editor = (
        <>
          <View
            style={{
              flexDirection: 'row',
              marginTop: 5,
              marginBottom: 5,
              marginLeft: 8,
              marginRight: 4,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Button
              selected={noteAmend === 'prepend'}
              style={{
                padding: '5px 10px',
                width: '33.33%',
                backgroundColor: theme.menuBackground,
                marginRight: 5,
                fontSize: 'inherit',
                ...(noteAmend === 'prepend' && {
                  backgroundColor: theme.buttonPrimaryBackground,
                  color: theme.buttonPrimaryText,
                  ':hover': {
                    backgroundColor: theme.buttonPrimaryBackgroundHover,
                    color: theme.buttonPrimaryTextHover,
                  },
                }),
                ...(noteAmend !== 'prepend' && {
                  backgroundColor: theme.buttonNormalBackground,
                  color: theme.buttonNormalText,
                  ':hover': {
                    backgroundColor: theme.buttonNormalBackgroundHover,
                    color: theme.buttonNormalTextHover,
                  },
                }),
              }}
              onClick={() => {
                onChangeMode('prepend');
                document.getElementById('noteInput').focus();
              }}
            >
              Prepend
            </Button>
            <Button
              selected={noteAmend === 'replace'}
              style={{
                padding: '5px 10px',
                width: '33.34%',
                backgroundColor: theme.menuBackground,
                marginRight: 5,
                fontSize: 'inherit',
                ...(noteAmend === 'replace' && {
                  backgroundColor: theme.buttonPrimaryBackground,
                  color: theme.buttonPrimaryText,
                  ':hover': {
                    backgroundColor: theme.buttonPrimaryBackgroundHover,
                    color: theme.buttonPrimaryTextHover,
                  },
                }),
                ...(noteAmend !== 'replace' && {
                  backgroundColor: theme.buttonNormalBackground,
                  color: theme.buttonNormalText,
                  ':hover': {
                    backgroundColor: theme.buttonNormalBackgroundHover,
                    color: theme.buttonNormalTextHover,
                  },
                }),
              }}
              onClick={() => {
                onChangeMode('replace');
                document.getElementById('noteInput').focus();
              }}
            >
              Replace
            </Button>
            <Button
              selected={noteAmend === 'append'}
              style={{
                padding: '5px 10px',
                width: '33.33%',
                backgroundColor: theme.menuBackground,
                marginRight: 5,
                fontSize: 'inherit',
                ...(noteAmend === 'append' && {
                  backgroundColor: theme.buttonPrimaryBackground,
                  color: theme.buttonPrimaryText,
                  ':hover': {
                    backgroundColor: theme.buttonPrimaryBackgroundHover,
                    color: theme.buttonPrimaryTextHover,
                  },
                }),
                ...(noteAmend !== 'append' && {
                  backgroundColor: theme.buttonNormalBackground,
                  color: theme.buttonNormalText,
                  ':hover': {
                    backgroundColor: theme.buttonNormalBackgroundHover,
                    color: theme.buttonNormalTextHover,
                  },
                }),
              }}
              onClick={() => {
                onChangeMode('append');
                document.getElementById('noteInput').focus();
              }}
            >
              Append
            </Button>
          </View>
          <Input
            id="noteInput"
            autoFocus
            focused={true}
            onEnter={e => onSelectNote(e.target.value, noteAmend)}
            style={inputStyle}
          />
        </>
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
          {...(isNarrowWidth && {
            renderCategoryItemGroupHeader: props => (
              <ItemHeader
                {...props}
                style={{
                  ...styles.largeText,
                  color: theme.menuItemTextHeader,
                  paddingTop: 10,
                  paddingBottom: 10,
                }}
              />
            ),
            renderCategoryItem: props => (
              <CategoryItem
                {...props}
                style={{
                  ...itemStyle,
                  color: theme.menuItemText,
                  borderRadius: 0,
                  borderTop: `1px solid ${theme.pillBorder}`,
                }}
              />
            ),
          })}
          {...autocompleteProps}
          showHiddenItems={false}
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
      onClose={onCloseInner}
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
