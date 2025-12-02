import { type CSSProperties, type ReactNode, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';
import { View } from '@actual-app/components/view';
import { format as formatDate, parse as parseDate, parseISO } from 'date-fns';

import { currentDay, dayFromDate } from 'loot-core/shared/months';
import { amountToInteger, currencyToInteger } from 'loot-core/shared/util';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { SectionLabel } from '@desktop-client/components/forms';
import { DateSelect } from '@desktop-client/components/select/DateSelect';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

const itemStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 400,
  paddingTop: 8,
  paddingBottom: 8,
};

type NoteAmendValue = Parameters<EditFieldModalProps['onSubmit']>[1];
type NoteAmendMode = Parameters<EditFieldModalProps['onSubmit']>[2];
const noteAmendStrings: Record<NoteAmendMode, string> = {
  replace: 'Replace',
  prepend: 'Prepend',
  append: 'Append',
  findAndReplace: 'Find and Replace',
};

export type EditFieldModalProps = Extract<
  ModalType,
  { name: 'edit-field' }
>['options'];

export function EditFieldModal({
  name,
  onSubmit,
  onClose,
}: EditFieldModalProps) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const noteInputRef = useRef<HTMLInputElement | null>(null);
  const noteReplaceInputRef = useRef<HTMLInputElement | null>(null);

  function onSelectNote(value: NoteAmendValue, mode?: NoteAmendMode) {
    if (value != null) {
      onSubmit(name, value, mode);
    }
  }

  function onSelect(value: string | number) {
    if (value != null) {
      // Process the value if needed
      if (name === 'amount') {
        if (typeof value === 'string') {
          const parsed = currencyToInteger(value);
          if (parsed === null) {
            alert(t('Invalid amount value'));
            return;
          }
          value = parsed;
        } else if (typeof value === 'number') {
          value = amountToInteger(value);
        }
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
  const [noteFindReplace, setNoteFindReplace] = useState({
    regex: false,
    find: '',
    replace: '',
  });

  switch (name) {
    case 'date':
      const today = currentDay();
      label = t('Date');
      minWidth = 350;
      editor = ({ close }) => (
        <DateSelect
          value={formatDate(parseISO(today), dateFormat)}
          dateFormat={dateFormat}
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
            {Object.keys(noteAmendStrings).map((mode, _, arr) => (
              <Button
                key={mode}
                style={{
                  padding: '5px 10px',
                  height: '100%',
                  width: `${100 / arr.length}%`,
                  backgroundColor: theme.menuBackground,
                  marginRight: 5,
                  fontSize: 'inherit',
                  ...(noteAmend === mode && {
                    backgroundColor: theme.buttonPrimaryBackground,
                    color: theme.buttonPrimaryText,
                    ':hover': {
                      backgroundColor: theme.buttonPrimaryBackgroundHover,
                      color: theme.buttonPrimaryTextHover,
                    },
                  }),
                  ...(noteAmend !== mode && {
                    backgroundColor: theme.buttonNormalBackground,
                    color: theme.buttonNormalText,
                    ':hover': {
                      backgroundColor: theme.buttonNormalBackgroundHover,
                      color: theme.buttonNormalTextHover,
                    },
                  }),
                }}
                onPress={() => {
                  onChangeMode(mode as NoteAmendMode);
                  noteInputRef.current?.focus();
                }}
              >
                <Trans>{noteAmendStrings[mode]}</Trans>
              </Button>
            ))}
          </View>
          {noteAmend === 'findAndReplace' ? (
            <View style={{ gap: 10 }}>
              <SpaceBetween gap={8}>
                <Toggle
                  id="noteRegex"
                  isOn={noteFindReplace.regex}
                  onToggle={isOn =>
                    setNoteFindReplace(current => ({ ...current, regex: isOn }))
                  }
                />
                <label htmlFor="noteRegex" title={t('Use Regular Expressions')}>
                  {t('Use Regular Expressions')}
                </label>
              </SpaceBetween>
              <Input
                ref={noteInputRef}
                autoFocus
                placeholder={t('Find')}
                value={noteFindReplace.find}
                onChange={({ currentTarget: { value } }) =>
                  setNoteFindReplace(current => ({ ...current, find: value }))
                }
                onEnter={() => {
                  noteReplaceInputRef.current?.focus();
                }}
                style={inputStyle}
              />
              <Input
                ref={noteReplaceInputRef}
                placeholder={t('Replace')}
                value={noteFindReplace.replace}
                onChange={({ currentTarget: { value } }) =>
                  setNoteFindReplace(current => ({
                    ...current,
                    replace: value,
                  }))
                }
                onEnter={() => {
                  if (noteFindReplace.regex) {
                    try {
                      new RegExp(noteFindReplace.find, 'g');
                    } catch (error) {
                      alert(t('Invalid regular expression'));
                      return;
                    }
                  }
                  onSelectNote(noteFindReplace, noteAmend);
                  close();
                }}
                style={inputStyle}
              />
            </View>
          ) : (
            <Input
              ref={noteInputRef}
              autoFocus
              onEnter={value => {
                onSelectNote(value, noteAmend);
                close();
              }}
              style={inputStyle}
            />
          )}
        </>
      );
      break;

    case 'amount':
      label = t('Amount');
      editor = ({ close }) => (
        <Input
          onEnter={value => {
            onSelect(value);
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
          height: isNarrowWidth
            ? 'calc(var(--visual-viewport-height) * 0.85)'
            : 275,
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
