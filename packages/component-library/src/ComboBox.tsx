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
  ComboBox as AriaComboBox,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  type ListBoxSectionProps,
  type ComboBoxProps as AriaComboBoxProps,
  type ListBoxItemProps,
  ComboBoxStateContext as AriaComboBoxStateContext,
  type Key,
} from 'react-aria-components';
import { type ComboBoxState as AriaComboBoxState } from 'react-stately';

import { css, cx } from '@emotion/css';

import { Input } from './Input';
import { Popover } from './Popover';
import { styles } from './styles';
import { theme } from './theme';
import { View } from './View';

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

type ComboBoxProps<T extends object> = Omit<
  AriaComboBoxProps<T>,
  'children'
> & {
  inputPlaceholder?: string;
  children: ComponentProps<typeof ListBox<T>>['children'];
};

export function ComboBox<T extends object>({
  children,
  ...props
}: ComboBoxProps<T>) {
  const viewRef = useRef<HTMLDivElement | null>(null);
  return (
    <AriaComboBox<T>
      allowsEmptyCollection
      allowsCustomValue
      menuTrigger="focus"
      {...props}
    >
      <View ref={viewRef}>
        <ComboBoxInput placeholder={props.inputPlaceholder} />
      </View>
      <Popover isNonModal className={popoverClassName()}>
        <ListBox<T>
          className={listBoxClassName({ width: viewRef.current?.clientWidth })}
        >
          {children}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}

type ComboBoxInputContextValue = {
  getFocusedKey?: (state: AriaComboBoxState<unknown>) => Key | null;
};

const ComboBoxInputContext =
  createContext<ComboBoxInputContextValue | null>(null);

type ComboBoxInputProviderProps = {
  children: ReactNode;
  getFocusedKey?: (state: AriaComboBoxState<unknown>) => Key | null;
};

export function ComboBoxInputProvider({
  children,
  getFocusedKey,
}: ComboBoxInputProviderProps) {
  return (
    <ComboBoxInputContext.Provider value={{ getFocusedKey }}>
      {children}
    </ComboBoxInputContext.Provider>
  );
}

type ComboBoxInputProps = ComponentProps<typeof Input>;

function ComboBoxInput({ onKeyUp, ...props }: ComboBoxInputProps) {
  const state = useContext(AriaComboBoxStateContext);
  const _onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      state?.revert();
    }
    onKeyUp?.(e);
  };

  const comboBoxInputContext = useContext(ComboBoxInputContext);

  useEffect(() => {
    if (state && state.inputValue && !state.selectionManager.focusedKey) {
      const focusedKey: Key | null =
        (comboBoxInputContext?.getFocusedKey
          ? comboBoxInputContext.getFocusedKey(state)
          : defaultGetFocusedKey(state)) ?? null;

      state.selectionManager.setFocusedKey(focusedKey);
    }
  }, [comboBoxInputContext, state, state?.inputValue]);

  return <Input onKeyUp={_onKeyUp} {...props} />;
}

function defaultGetFocusedKey<T>(state: AriaComboBoxState<T>) {
  // Focus on the first suggestion item when typing.
  const keys = Array.from(state.collection.getKeys());
  return (
    keys
      .map(key => state.collection.getItem(key))
      .find(i => i && i.type === 'item')?.key ?? null
  );
}

const defaultComboBoxSectionClassName = () => css({
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

type ComboBoxSectionProps<T extends object> = ListBoxSectionProps<T>;

export function ComboBoxSection<T extends object>({
  className,
  ...props
}: ComboBoxSectionProps<T>) {
  return (
    <ListBoxSection
      className={cx(defaultComboBoxSectionClassName(), className)}
      {...props}
    />
  );
}

const defaultComboBoxItemClassName = () => css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  paddingTop: 5,
  paddingBottom: 5,
  paddingLeft: 20,
});

type ComboBoxItemProps = ListBoxItemProps;

export function ComboBoxItem({
  className,
  ...props
}: ComboBoxItemProps) {
  return (
    <ListBoxItem
      className={
        typeof className === 'function'
          ? renderProps =>
              cx(defaultComboBoxItemClassName(), className(renderProps))
          : cx(defaultComboBoxItemClassName(), className)
      }
      {...props}
    />
  );
}
