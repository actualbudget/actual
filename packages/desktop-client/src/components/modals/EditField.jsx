import React from 'react';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { DateSelect } from '../select/DateSelect';

import { AccountAutocompleteModal } from './AccountAutocompleteModal';
import { CategoryAutocompleteModal } from './CategoryAutocompleteModal';
import { PayeeAutocompleteModal } from './PayeeAutocompleteModal';

export function EditField({ modalProps, name, onSubmit, onClose }) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { grouped: categoryGroups } = useCategories();

  const onCloseInner = () => {
    modalProps.onClose();
    onClose?.();
  };

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

  switch (name) {
    case 'date':
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

    case 'category':
      return (
        <CategoryAutocompleteModal
          modalProps={modalProps}
          autocompleteProps={{
            categoryGroups,
            showHiddenCategories: false,
            value: null,
            onSelect: categoryId => {
              onSelect(categoryId);
            },
          }}
          onClose={onClose}
        />
      );

    case 'payee':
      return (
        <PayeeAutocompleteModal
          modalProps={modalProps}
          autocompleteProps={{
            value: null,
            onSelect: payeeId => {
              onSelect(payeeId);
            },
          }}
          onClose={onClose}
        />
      );

    case 'account':
      return (
        <AccountAutocompleteModal
          modalProps={modalProps}
          autocompleteProps={{
            value: null,
            onSelect: accountId => {
              onSelect(accountId);
            },
          }}
          onClose={onClose}
        />
      );

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
