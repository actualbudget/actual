import React, { useState } from 'react';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useDateFormat } from '../../hooks/useDateFormat';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { DateSelect } from '../select/DateSelect';

export function EditFieldModal({ name, onSubmit, onClose }) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  function onSelectNote(value, mode) {
    if (value != null) {
      onSubmit(name, value, mode);
    }
  }

  function onSelect(value) {
    if (value != null) {
      // Process the value if needed
      if (name === 'amount') {
        value = amountToInteger(value);
      }

      onSubmit(name, value);
    }
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
      editor = ({ close }) => (
        <DateSelect
          value={formatDate(parseISO(today), dateFormat)}
          dateFormat={dateFormat}
          focused={true}
          embedded={true}
          onUpdate={() => {}}
          onSelect={date => {
            onSelect(dayFromDate(parseDate(date, 'yyyy-MM-dd', new Date())));
            close();
          }}
        />
      );
      break;

    case 'notes':
      label = 'Notes';
      editor = ({ close }) => (
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
              onPress={() => {
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
              onPress={() => {
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
              onPress={() => {
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
            onEnter={e => {
              onSelectNote(e.target.value, noteAmend);
              close();
            }}
            style={inputStyle}
          />
        </>
      );
      break;

    case 'amount':
      label = 'Amount';
      editor = ({ close }) => (
        <Input
          focused={true}
          onEnter={e => {
            onSelect(e.target.value);
            close();
          }}
          style={inputStyle}
        />
      );
      break;

    default:
  }

  return (
    <Modal
      name="edit-field"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth ? '85vh' : 275,
          padding: '15px 10px',
          ...(minWidth && { minWidth }),
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({ state: { close } }) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={label}
              rightContent={<ModalCloseButton onPress={close} />}
            />
          )}
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
            <View style={{ flex: 1 }}>{editor({ close })}</View>
          </View>
        </>
      )}
    </Modal>
  );
}
