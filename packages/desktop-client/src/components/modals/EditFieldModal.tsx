import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
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
import { LabeledCheckbox } from '@desktop-client/components/forms/LabeledCheckbox';
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
type NoteAmendMode = NonNullable<
  Parameters<EditFieldModalProps['onSubmit']>[2]
>;
const noteAmendStrings: Record<NoteAmendMode, string> = {
  prepend: 'Prepend',
  replace: 'Replace',
  append: 'Append',
  findAndReplace: 'Find and Replace',
};

type EditFieldModalProps = Extract<
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
  const [noteFindReplace, setNoteFindReplace] = useState<
    Extract<NoteAmendValue, { useRegex: boolean }>
  >({
    useRegex: false,
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
          embedded
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
              gap: 5,
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
                {t(noteAmendStrings[mode as NoteAmendMode])}
              </Button>
            ))}
          </View>
          {noteAmend === 'findAndReplace' ? (
            <View style={{ gap: 10 }}>
              <LabeledCheckbox
                id="noteRegex"
                checked={noteFindReplace.useRegex}
                onChange={({ currentTarget: { checked } }) =>
                  setNoteFindReplace(current => ({
                    ...current,
                    useRegex: checked,
                  }))
                }
              >
                {t('Use Regular Expressions')}
              </LabeledCheckbox>
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
                  if (noteFindReplace.find === '') {
                    alert(t('Find value required'));
                    return;
                  }
                  if (noteFindReplace.useRegex) {
                    try {
                      new RegExp(noteFindReplace.find, 'g');
                    } catch {
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
