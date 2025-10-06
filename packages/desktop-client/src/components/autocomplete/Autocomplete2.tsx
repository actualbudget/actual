import {
  type ComponentProps,
  useRef,
  useContext,
  type KeyboardEvent,
  useEffect,
  createContext,
  type ReactNode,
} from 'react';
import {
  ComboBox,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  type ListBoxSectionProps,
  type ComboBoxProps,
  type ListBoxItemProps,
  ComboBoxStateContext,
  type Key,
} from 'react-aria-components';
import { type ComboBoxState } from 'react-stately';

import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

const popoverClassName = () =>
  css({
    ...styles.darkScrollbar,
    ...styles.popover,
    backgroundColor: theme.menuAutoCompleteBackground,
    color: theme.menuAutoCompleteText,
    padding: '5px 0',
    borderRadius: 4,
  });

const listBoxClassName = ({ width }: { width?: number }) =>
  css({
    width,
    minWidth: 200,
    maxHeight: 200,
    overflow: 'auto',
    '& [data-focused]': {
      backgroundColor: theme.menuAutoCompleteBackgroundHover,
    },
  });

type Autocomplete2Props<T extends object> = Omit<
  ComboBoxProps<T>,
  'children'
> & {
  inputPlaceholder?: string;
  children: ComponentProps<typeof ListBox<T>>['children'];
};

export function Autocomplete2<T extends object>({
  children,
  ...props
}: Autocomplete2Props<T>) {
  const viewRef = useRef<HTMLDivElement | null>(null);
  return (
    <ComboBox<T>
      allowsEmptyCollection
      allowsCustomValue
      menuTrigger="focus"
      {...props}
    >
      <View ref={viewRef}>
        <AutocompleteInput placeholder={props.inputPlaceholder} />
      </View>
      <Popover isNonModal className={popoverClassName()}>
        <ListBox<T>
          className={listBoxClassName({ width: viewRef.current?.clientWidth })}
        >
          {children}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

type AutocompleteInputContextValue = {
  getFocusedKey?: (state: ComboBoxState<unknown>) => Key | null;
};

const AutocompleteInputContext =
  createContext<AutocompleteInputContextValue | null>(null);

type AutocompleteInputProviderProps = {
  children: ReactNode;
  getFocusedKey?: (state: ComboBoxState<unknown>) => Key | null;
};

export function AutocompleteInputProvider({
  children,
  getFocusedKey,
}: AutocompleteInputProviderProps) {
  return (
    <AutocompleteInputContext.Provider value={{ getFocusedKey }}>
      {children}
    </AutocompleteInputContext.Provider>
  );
}

type AutocompleteInputProps = ComponentProps<typeof Input>;

function AutocompleteInput({ onKeyUp, ...props }: AutocompleteInputProps) {
  const state = useContext(ComboBoxStateContext);
  const _onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      state?.revert();
    }
    onKeyUp?.(e);
  };

  const autocompleteInputContext = useContext(AutocompleteInputContext);

  useEffect(() => {
    if (state && state.inputValue && !state.selectionManager.focusedKey) {
      const focusedKey: Key | null = autocompleteInputContext?.getFocusedKey
        ? autocompleteInputContext.getFocusedKey(state)
        : defaultGetFocusedKey(state);

      state.selectionManager.setFocusedKey(focusedKey);
    }
  }, [autocompleteInputContext, state, state?.inputValue]);

  return <Input onKeyUp={_onKeyUp} {...props} />;
}

function defaultGetFocusedKey<T>(state: ComboBoxState<T>) {
  // Focus on the first suggestion item when typing.
  const keys = Array.from(state.collection.getKeys());
  return keys
    .map(key => state.collection.getItem(key))
    .find(i => i && i.type === 'item')?.key;
}

const defaultAutocompleteSectionClassName = css({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  '& header': {
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    color: theme.menuAutoCompleteTextHeader,
  },
});

type AutocompleteSectionProps<T extends object> = ListBoxSectionProps<T>;

export function AutocompleteSection<T extends object>({
  className,
  ...props
}: AutocompleteSectionProps<T>) {
  return (
    <ListBoxSection
      className={cx(defaultAutocompleteSectionClassName, className)}
      {...props}
    />
  );
}

const defaultAutocompleteItemClassName = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  paddingTop: 5,
  paddingBottom: 5,
  paddingLeft: 20,
});

type AutocompleteItemProps = ListBoxItemProps;

export function AutocompleteItem({
  className,
  ...props
}: AutocompleteItemProps) {
  return (
    <ListBoxItem
      className={
        typeof className === 'function'
          ? renderProps =>
              cx(defaultAutocompleteItemClassName, className(renderProps))
          : cx(defaultAutocompleteItemClassName, className)
      }
      {...props}
    />
  );
}
