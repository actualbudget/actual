import React, { useState } from 'react';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useDateFormat } from '../../hooks/useDateFormat';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { DateSelect } from '../select/DateSelect';

export function EditField({ modalProps, name, onSubmit, onClose }) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
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

  const [noteAmend, onChangeMode] = useState('replace');

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
      style={{
        flex: 0,
        height: isNarrowWidth ? '85vh' : 275,
        padding: '15px 10px',
        ...(minWidth && { minWidth }),
        backgroundColor: theme.menuAutoCompleteBackground,
      }}
    >
      {() => (
        <View>
          {!isNarrowWidth && (
            <SectionLabel
              title={label}
              style={{
                alignSelf: 'center',
                color: theme.menuAutoCompleteText,
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
