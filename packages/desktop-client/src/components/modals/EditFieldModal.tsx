import React, {
  type CSSProperties,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { parseISO, format as formatDate, parse as parseDate } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/src/shared/months';
import { amountToInteger } from 'loot-core/src/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

import { useDateFormat } from '../../hooks/useDateFormat';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { useResponsive } from '../responsive/ResponsiveProvider';
import { DateSelect } from '../select/DateSelect';

const itemStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 400,
  paddingTop: 8,
  paddingBottom: 8,
};

type NoteAmendMode = 'replace' | 'prepend' | 'append';

type EditFieldModalProps = {
  name: keyof Pick<TransactionEntity, 'date' | 'amount' | 'notes'>;
  onSubmit: (
    name: keyof Pick<TransactionEntity, 'date' | 'amount' | 'notes'>,
    value: string | number,
    mode?: NoteAmendMode,
  ) => void;
  onClose: () => void;
};

export function EditFieldModal({
  name,
  onSubmit,
  onClose,
}: EditFieldModalProps) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const noteInputRef = useRef<HTMLInputElement | null>(null);

  function onSelectNote(value: string, mode?: NoteAmendMode) {
    if (value != null) {
      onSubmit(name, value, mode);
    }
  }

  function onSelect(value: string | number) {
    if (value != null) {
      // Process the value if needed
      if (name === 'amount' && typeof value === 'number') {
        value = amountToInteger(value);
      }

      onSubmit(name, value);
    }
  }

  const { isNarrowWidth } = useResponsive();
  let label: string;
  let editor: (props: { close: () => void }) => ReactNode;
  let minWidth: number | undefined;

  const inputStyle: CSSProperties = {
    ...(isNarrowWidth && itemStyle),
  };

  const [noteAmend, onChangeMode] = useState<NoteAmendMode>('replace');

  switch (name) {
    case 'date':
      const today = currentDay();
      label = t('Date');
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
      label = t('Notes');
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
                noteInputRef.current?.focus();
              }}
            >
              {t('Prepend')}
            </Button>
            <Button
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
                noteInputRef.current?.focus();
              }}
            >
              {t('Replace')}
            </Button>
            <Button
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
                noteInputRef.current?.focus();
              }}
            >
              {t('Append')}
            </Button>
          </View>
          <Input
            inputRef={noteInputRef}
            autoFocus
            focused={true}
            onEnter={e => {
              onSelectNote(e.currentTarget.value, noteAmend);
              close();
            }}
            style={inputStyle}
          />
        </>
      );
      break;

    case 'amount':
      label = t('Amount');
      editor = ({ close }) => (
        <Input
          focused={true}
          onEnter={e => {
            onSelect(e.currentTarget.value);
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
