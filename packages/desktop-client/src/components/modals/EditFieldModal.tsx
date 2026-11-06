import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { currentDay, dayFromDate } from '@actual-app/core/shared/months';
import {
  amountToInteger,
  currencyToInteger,
} from '@actual-app/core/shared/util';
import { parse as parseDate } from 'date-fns';

import { NoteInsertHashButton } from '#components/autocomplete/NoteInsertHashButton';
import { NoteTagAutocomplete } from '#components/autocomplete/NoteTagAutocomplete';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { SectionLabel } from '#components/forms';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { InputField } from '#components/mobile/MobileForms';
import { DateSelect } from '#components/select/DateSelect';
import { useDateFormat } from '#hooks/useDateFormat';
import type { Modal as ModalType } from '#modals/modalsSlice';

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
  const [value, setValue] = useState(name === 'date' ? currentDay() : '');

  function onSelectNote(value: NoteAmendValue, mode?: NoteAmendMode) {
    if (value != null) {
      onSubmit(name, value, mode);
    }
  }

  function onSelect(value: string | number) {
    if (value != null) {
      onSubmit(name, value);
    }
  }

  const { isNarrowWidth } = useResponsive();
  let label: string;
  let editor: (props: { apply: (value: string) => void }) => ReactNode;
  let apply: (value: string) => boolean = value => {
    onSelect(value);
    return true;
  };
  let width: string | undefined;
  let height: number | 'auto' = 275;

  const inputStyle: CSSProperties = {
    ...(isNarrowWidth && itemStyle),
  };

  const [noteMode, onChangeMode] = useState<NoteAmendMode>('replace');
  const [noteFindReplace, setNoteFindReplace] = useState<
    Extract<NoteAmendValue, { useRegex: boolean }>
  >({
    useRegex: false,
    find: '',
    replace: '',
  });

  switch (name) {
    case 'date': {
      const today = currentDay();
      label = t('Date');
      // Definite width — the embedded calendar's 100%-wide grid must not
      // size the modal (see DateSelect)
      width = tokens.breakpoint_small;
      height = 'auto'; // fit the calendar; 275 clips six-row months
      apply = date => {
        onSelect(dayFromDate(parseDate(date, 'yyyy-MM-dd', new Date())));
        return true;
      };
      editor = ({ apply }) => (
        <DateSelect
          value={today}
          dateFormat={dateFormat}
          embedded
          autoFocus
          onSelect={apply}
          onUpdate={setValue}
          clearOnBlur={false}
        />
      );
      break;
    }

    case 'notes':
      label = t('Notes');
      width = tokens.breakpoint_small;
      if (noteMode === 'findAndReplace') {
        apply = () => {
          if (noteFindReplace.find === '') {
            alert(t('Find value required'));
            return false;
          }
          if (noteFindReplace.useRegex) {
            try {
              new RegExp(noteFindReplace.find, 'g');
            } catch {
              alert(t('Invalid regular expression'));
              return false;
            }
          }
          onSelectNote(noteFindReplace, noteMode);
          return true;
        };
      } else {
        apply = value => {
          onSelectNote(value, noteMode);
          return true;
        };
      }
      editor = ({ apply }) => (
        <>
          <View
            style={{
              flexDirection: 'row',
              marginTop: 5,
              marginBottom: 5,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {Object.keys(noteAmendStrings).map(mode => (
              <Button
                key={mode}
                style={{
                  flex: 1,
                  padding: '5px 10px',
                  height: '100%',
                  backgroundColor: theme.menuBackground,
                  fontSize: 'inherit',
                  ...(noteMode === mode && {
                    backgroundColor: theme.buttonPrimaryBackground,
                    color: theme.buttonPrimaryText,
                    ':hover': {
                      backgroundColor: theme.buttonPrimaryBackgroundHover,
                      color: theme.buttonPrimaryTextHover,
                    },
                  }),
                  ...(noteMode !== mode && {
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
          {noteMode === 'findAndReplace' ? (
            <View style={{ gap: 10 }}>
              <LabeledCheckbox
                id="noteRegex"
                checked={noteFindReplace.useRegex}
                style={{ color: theme.menuAutoCompleteText }}
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
                onEnter={apply}
                style={inputStyle}
              />
            </View>
          ) : (
            <>
              {isNarrowWidth ? (
                <InputField
                  ref={noteInputRef}
                  autoFocus
                  iconEnd={<NoteInsertHashButton inputRef={noteInputRef} />}
                  value={value}
                  onChange={({ currentTarget: { value } }) => setValue(value)}
                  onEnter={apply}
                  style={inputStyle}
                />
              ) : (
                <Input
                  ref={noteInputRef}
                  autoFocus
                  value={value}
                  onChange={({ currentTarget: { value } }) => setValue(value)}
                  onEnter={apply}
                  style={inputStyle}
                />
              )}
              <NoteTagAutocomplete inputRef={noteInputRef} />
            </>
          )}
        </>
      );
      break;

    case 'amount':
      label = t('Amount');
      apply = value => {
        let num: number | null = null;
        if (typeof value === 'string') {
          const parsed = currencyToInteger(value);
          if (parsed === null) {
            alert(t('Invalid amount value'));
            return false;
          }
          num = parsed;
        } else if (typeof value === 'number') {
          num = amountToInteger(value);
        }

        if (num === null) {
          alert(t('Invalid amount value'));
          return false;
        }

        onSelect(num);
        return true;
      };
      editor = ({ apply }) => (
        <Input
          value={value}
          onChange={({ currentTarget: { value } }) => setValue(value)}
          onEnter={apply}
          autoFocus
          style={inputStyle}
        />
      );
      break;

    default:
      throw new Error(`Unhandled edit field name: ${String(name)}`);
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
            : height,
          padding: '15px 10px',
          ...(width && { width }),
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({ state }) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={label}
              rightContent={<ModalCloseButton onPress={() => state.close()} />}
            />
          )}
          <View style={{ height: '100%' }}>
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
            <View style={{ flex: 1 }}>
              {editor({
                apply: value => {
                  setValue(value);
                  const close = apply(value);
                  if (close) state.close();
                },
              })}
            </View>
            <View>
              <Button
                onPress={() => {
                  const close = apply(value);
                  if (close) state.close();
                }}
              >
                <Trans>Apply</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
