// @ts-strict-ignore
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ComponentProps,
  FocusEvent,
  JSX,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
  UIEvent,
} from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgDelete, SvgExpandArrow } from '@actual-app/components/icons/v0';
import { SvgCheckmark } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useMergedRefs } from '#hooks/useMergedRefs';
import { useModalState } from '#hooks/useModalState';
import {
  AvoidRefocusScrollProvider,
  useProperFocus,
} from '#hooks/useProperFocus';
import { useSelectedDispatch, useSelectedItems } from '#hooks/useSelected';
import { useSheetValue } from '#hooks/useSheetValue';
import type {
  Binding,
  SheetFields,
  SheetNames,
  Spreadsheets,
} from '#spreadsheet';

import { FixedSizeList } from './FixedSizeList';
import {
  ConditionalPrivacyFilter,
  mergeConditionalPrivacyFilterProps,
} from './PrivacyFilter';
import { useCellEditor } from './useCellEditor';
import type { CellEditSession } from './useCellEditor';

export const ROW_HEIGHT = 32;

function fireBlur(onBlur, e) {
  if (document.hasFocus()) {
    // We only fire the blur event if the app is still focused
    // because the blur event is fired when the app goes into
    // the background and we want to ignore that
    onBlur?.(e);
  } else {
    // Otherwise, stop React from bubbling this event and swallow it
    e.stopPropagation();
  }
}

type FieldProps = ComponentProps<typeof View> & {
  width?: CSSProperties['width'];
  name?: string;
  truncate?: boolean;
  contentStyle?: CSSProperties;
};
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { width, name, truncate = true, children, style, contentStyle, ...props },
  ref,
) {
  return (
    <View
      innerRef={ref}
      {...props}
      style={{
        ...(width === 'flex' ? { flex: 1, flexBasis: 0 } : { width }),
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        ...styles.smallText,
        ...style,
      }}
      data-testid={name}
    >
      {/* This is wrapped so that the padding is not taken into
          account with the flex width (which aligns it with the Cell
          component) */}
      <View
        style={{
          flex: 1,
          padding: '0 5px',
          justifyContent: 'center',
          ...contentStyle,
        }}
      >
        {truncate ? (
          <Text
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
});

export const UnexposedCellContent = forwardRef<
  HTMLSpanElement,
  Pick<CellProps, 'value' | 'formatter' | 'style'>
>(function UnexposedCellContent({ value, formatter, style, ...props }, ref) {
  return (
    <Text
      innerRef={ref}
      style={{
        flexGrow: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style,
        ...props,
      }}
    >
      {formatter ? formatter(value) : value}
    </Text>
  );
});

type CellProps = Omit<ComponentProps<typeof View>, 'children' | 'value'> & {
  formatter?: (value: string, type?: unknown) => string | JSX.Element;
  focused?: boolean;
  textAlign?: CSSProperties['textAlign'];
  alignItems?: CSSProperties['alignItems'];
  plain?: boolean;
  exposed?: boolean;
  children?: ReactNode | (() => ReactNode);
  unexposedContent?: (
    props: ComponentProps<typeof UnexposedCellContent>,
  ) => ReactNode;
  value?: string;
  valueStyle?: CSSProperties | null;
  onExpose?: (name: string) => void;
  privacyFilter?: ComponentProps<
    typeof ConditionalPrivacyFilter
  >['privacyFilter'];
};
export function Cell({
  width,
  name,
  exposed,
  focused,
  value,
  formatter,
  textAlign,
  alignItems,
  onExpose,
  children,
  plain,
  style,
  valueStyle,
  unexposedContent,
  privacyFilter,
  ...viewProps
}: CellProps) {
  const mouseCoords = useRef(null);
  const viewRef = useRef(null);

  useProperFocus(viewRef, focused !== undefined ? focused : exposed);

  const widthStyle: CSSProperties =
    width === 'flex' ? { flex: 1, flexBasis: 0 } : { width };
  const cellStyle: CSSProperties = {
    position: 'relative',
    textAlign: textAlign || 'left',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.tableBorder,
    alignItems,
  };

  const conditionalPrivacyFilter = useMemo(
    () => (
      <ConditionalPrivacyFilter
        privacyFilter={mergeConditionalPrivacyFilterProps(
          {
            activationFilters: [!focused, !exposed],
          },
          privacyFilter,
        )}
      >
        {plain ? (
          children
        ) : exposed ? (
          // @ts-expect-error Missing props refinement
          children()
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flex: 1,
              padding: '0 5px',
              alignItems: 'center',
              ...styles.smallText,
              ...valueStyle,
            }}
            // Can't use click because we only want to expose the cell if
            // the user does a direct click, not if they also drag the
            // mouse to select something
            onMouseDown={e => (mouseCoords.current = [e.clientX, e.clientY])}
            // When testing, allow the click handler to be used instead
            onClick={
              global.IS_TESTING
                ? () => onExpose?.(name)
                : e => {
                    if (
                      mouseCoords.current &&
                      Math.abs(e.clientX - mouseCoords.current[0]) < 5 &&
                      Math.abs(e.clientY - mouseCoords.current[1]) < 5
                    ) {
                      onExpose?.(name);
                    }
                  }
            }
          >
            {unexposedContent ? (
              unexposedContent({ value, formatter })
            ) : (
              <UnexposedCellContent value={value} formatter={formatter} />
            )}
          </View>
        )}
      </ConditionalPrivacyFilter>
    ),
    [
      privacyFilter,
      focused,
      exposed,
      children,
      plain,
      valueStyle,
      onExpose,
      name,
      unexposedContent,
      value,
      formatter,
    ],
  );

  const mergedRef = useMergedRefs(viewRef, viewProps.ref, viewProps.innerRef);

  return (
    <View
      style={{ ...widthStyle, ...cellStyle, ...style }}
      {...viewProps}
      innerRef={mergedRef}
      data-testid={name}
    >
      {conditionalPrivacyFilter}
    </View>
  );
}

type RowProps = ComponentProps<typeof View> & {
  inset?: number;
  collapsed?: boolean;
};
export const Row = forwardRef<HTMLDivElement, RowProps>(function Row(
  { inset = 0, collapsed, children, height, style, ...nativeProps },
  ref,
) {
  return (
    <View
      ref={ref}
      style={{
        flexDirection: 'row',
        height: height || ROW_HEIGHT,
        flex: '0 0 ' + (height || ROW_HEIGHT) + 'px',
        userSelect: 'text',
        ...(collapsed && { marginTop: -1 }),
        ...style,
      }}
      data-testid="row"
      {...nativeProps}
    >
      {inset !== 0 && <Field width={inset} />}
      {children}
      {inset !== 0 && <Field width={inset} />}
    </View>
  );
});

const inputCellStyle = {
  padding: '5px 3px',
  margin: '0 1px',
};

const readonlyInputStyle = {
  backgroundColor: 'transparent',
  // oxlint-disable-next-line actual/theme-token-roles
  '::selection': { backgroundColor: theme.formInputTextReadOnlySelection },
};

type InputValueProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onUpdate'
> & {
  value?: string;
  onUpdate?: (newValue: string, isEdited: boolean) => void;
  onExit?: () => void;
} & {
  [key: `data-${string}`]: unknown;
};

function InputValue({
  value: defaultValue,
  onUpdate,
  onBlur,
  onExit,
  onKeyDown: userOnKeyDown,
  ...props
}: InputValueProps) {
  const cellEditor = useCellEditor({
    committedValue: defaultValue ?? '',
    onUpdate,
    onExit,
    onBlur: onBlur ? e => fireBlur(onBlur, e) : undefined,
  });

  const ops = ['+', '-', '*', '/', '^'];

  function valueIsASingleOperator(text) {
    return text?.length === 1 && ops.includes(text.charAt(0));
  }

  function setValue_(text) {
    if (valueIsASingleOperator(text)) {
      cellEditor.setValue(defaultValue + text);
    } else {
      cellEditor.setValue(text);
    }
  }

  function onKeyDown_(e: KeyboardEvent<HTMLInputElement>) {
    userOnKeyDown?.(e);
    if (e.defaultPrevented || e.isPropagationStopped()) {
      return;
    }

    if (e.key === 'Escape') {
      cellEditor.onKeyDown(e);
      return;
    }

    if (e.key !== 'Enter' && e.key !== 'Tab') {
      e.stopPropagation();
    }

    if (shouldSaveFromKey(e)) {
      cellEditor.commitEdit();
    }
  }

  return (
    <Input
      {...props}
      value={cellEditor.value}
      onChangeValue={setValue_}
      onBlur={cellEditor.onBlur}
      onUpdate={undefined}
      onKeyDown={onKeyDown_}
      style={{
        ...inputCellStyle,
        ...(props.readOnly ? readonlyInputStyle : null),
        ...props.style,
      }}
    />
  );
}

type InputCellProps = ComponentProps<typeof Cell> & {
  inputProps?: ComponentProps<typeof InputValue>;
  onUpdate?: ComponentProps<typeof InputValue>['onUpdate'];
  onBlur?: ComponentProps<typeof InputValue>['onBlur'];
  onExit?: ComponentProps<typeof InputValue>['onExit'];
  textAlign?: CSSProperties['textAlign'];
};
export function InputCell({
  inputProps,
  onUpdate,
  onBlur,
  onExit,
  textAlign,
  ...props
}: InputCellProps) {
  return (
    <Cell textAlign={textAlign} {...props}>
      {() => (
        <InputValue
          value={props.value}
          onUpdate={onUpdate}
          onBlur={onBlur}
          onExit={onExit}
          style={{ textAlign, ...(inputProps && inputProps.style) }}
          {...inputProps}
        />
      )}
    </Cell>
  );
}

function shouldSaveFromKey(e: KeyboardEvent) {
  switch (e.key) {
    case 'Tab':
    case 'Enter':
      e.preventDefault();
      return true;
    default:
  }
}

export type CustomCellRenderProps<T = string | undefined> = {
  onBlur: (ev: FocusEvent) => void;
  onKeyDown: (ev: KeyboardEvent) => void;
  onUpdate: (value: T) => void;
  onSave: (value: T) => void;
  shouldSaveFromKey: (ev: KeyboardEvent) => boolean;
  inputStyle: CSSProperties;
  value: T;
  editSession: CellEditSession<T>;
};
type CustomCellProps<T = string | undefined> = Omit<
  ComponentProps<typeof Cell>,
  'children' | 'value'
> & {
  value?: T;
  // Starting value for edits when it differs from the displayed value
  editValue?: T;
  children?: (props: CustomCellRenderProps<T>) => ReactNode;
  onUpdate?: (value: T) => void;
  onBlur?: (ev: UIEvent<unknown>) => void;
  onExit?: () => void;
};
export function CustomCell<T = string | undefined>({
  value: defaultValue,
  editValue,
  children,
  onUpdate,
  onBlur,
  onExit,
  ...props
}: CustomCellProps<T>) {
  const committedValue = (
    editValue !== undefined ? editValue : defaultValue
  ) as T;
  const cellEditor = useCellEditor<T>({
    committedValue,
    isEditing: props.exposed ?? false,
    onUpdate: onUpdate ? value => onUpdate(value) : undefined,
    onExit,
    onBlur: onBlur ? (e: FocusEvent) => fireBlur(onBlur, e) : undefined,
  });

  function onKeyDown_(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cellEditor.onKeyDown(e);
      return;
    }

    if (shouldSaveFromKey(e)) {
      cellEditor.commitEdit();
    }
  }

  // Blur also fires when the app loses focus. The input is focused again
  // when the app returns, so don't save or end the session then.
  function onBlur_(e: FocusEvent) {
    if (document.hasFocus()) {
      cellEditor.onBlur(e);
    }
  }

  const editSession: CellEditSession<T> = {
    onUpdateDraft: cellEditor.setValue,
    onCommit: cellEditor.commitEdit,
    onCancel: cellEditor.cancelEdit,
  };

  return (
    <Cell {...props} value={defaultValue as unknown as string}>
      {() =>
        children?.({
          onBlur: onBlur_,
          onKeyDown: onKeyDown_,
          onUpdate: cellEditor.setValue,
          onSave: cellEditor.commitEdit,
          shouldSaveFromKey,
          inputStyle: inputCellStyle,
          value: cellEditor.value,
          editSession,
        })
      }
    </Cell>
  );
}

type DeleteCellProps = Omit<ComponentProps<typeof Cell>, 'children'> & {
  onDelete?: () => void;
};
export function DeleteCell({ onDelete, style, ...props }: DeleteCellProps) {
  return (
    <Cell
      {...props}
      name="delete"
      width={20}
      style={{ alignItems: 'center', userSelect: 'none', ...style }}
      onClick={e => {
        e.stopPropagation();
        onDelete?.();
      }}
    >
      {() => <SvgDelete width={7} height={7} />}
    </Cell>
  );
}

type CellButtonProps = {
  children: ReactNode;
  style?: CSSProperties;
  primary?: boolean;
  bare?: boolean;
  disabled?: boolean;
  clickBehavior?: string;
  onSelect?: (e) => void;
  onEdit?: () => void;
  className?: string;
};
export const CellButton = forwardRef<HTMLDivElement, CellButtonProps>(
  (
    {
      children,
      style,
      primary,
      bare,
      disabled,
      clickBehavior,
      onSelect,
      onEdit,
      className,
    },
    ref,
  ) => {
    // This represents a cell that acts like a button: it's clickable,
    // focusable, etc. The reason we don't use a button is because the
    // full behavior is undesirable: we really don't want stuff like
    // "click is fired when enter is pressed". We have very custom
    // controls and focus/active states.
    //
    // Important behavior:
    // * X/SPACE/etc keys select the button _on key down_ and not on key
    //   up. This means it instantly selects and if you hold it down it
    //   will repeatedly select.
    // * The cell begins editing on focus. That means if the user does a
    //   mouse down, but moves out of the element and then does mouse
    //   up, it will properly still receive focus & being editing
    return (
      <View
        innerRef={ref}
        className={className}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'x' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) {
              onSelect?.(e);
            }
          }
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          cursor: 'default',
          transition: 'box-shadow .15s',
          backgroundColor: bare
            ? 'transparent'
            : disabled // always use disabled before primary since we can have a disabled primary button
              ? theme.buttonNormalDisabledBackground
              : primary
                ? theme.buttonPrimaryBackground
                : theme.buttonNormalBackground,
          border: bare
            ? 'none'
            : '1px solid ' +
              (disabled
                ? theme.buttonNormalDisabledBorder
                : primary
                  ? theme.buttonPrimaryBorder
                  : theme.buttonNormalBorder),
          color: bare
            ? 'inherit'
            : disabled
              ? theme.buttonNormalDisabledText
              : primary
                ? theme.buttonPrimaryText
                : theme.buttonNormalText,
          ':focus': bare
            ? null
            : {
                outline: 0,
                boxShadow: `1px 1px 2px ${theme.buttonNormalShadow}`,
              },
          ...style,
        }}
        onFocus={() => onEdit?.()}
        data-testid="cell-button"
        onClick={
          clickBehavior === 'none'
            ? null
            : e => {
                if (!disabled) {
                  onSelect?.(e);
                  onEdit?.();
                }
              }
        }
      >
        {children}
      </View>
    );
  },
);

CellButton.displayName = 'CellButton';

type SelectCellProps = Omit<ComponentProps<typeof Cell>, 'children'> & {
  partial?: boolean;
  onEdit?: () => void;
  onSelect?: (e) => void;
  icon?: ReactNode;
  buttonProps?: Partial<CellButtonProps>;
};
export function SelectCell({
  focused,
  selected,
  style,
  onSelect,
  onEdit,
  icon = <SvgCheckmark width={6} height={6} />,
  buttonProps = {},
  ...props
}: SelectCellProps) {
  return (
    <Cell
      {...props}
      focused={focused}
      name="select"
      width={20}
      style={{ alignItems: 'center', userSelect: 'none', ...style }}
      onClick={e => {
        e.stopPropagation();
        onSelect?.(e);
        onEdit?.();
      }}
    >
      {() => (
        <CellButton
          style={{
            width: 12,
            height: 12,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 3,
            border: selected
              ? '1px solid ' + theme.checkboxBorderSelected
              : '1px solid ' + theme.formInputBorder,
            color: theme.checkboxText,
            backgroundColor: selected
              ? theme.checkboxBackgroundSelected
              : theme.tableBackground,
            ':focus': {
              border: '1px solid ' + theme.checkboxBorderSelected,
              boxShadow: '0 1px 2px ' + theme.checkboxShadowSelected,
            },
          }}
          onEdit={onEdit}
          onSelect={onSelect}
          clickBehavior="none"
          {...buttonProps}
        >
          {selected && icon}
        </CellButton>
      )}
    </Cell>
  );
}

type SheetCellValueProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = {
  binding: Binding<SheetName, FieldName>;
  type: FormatType;
  getValueStyle?: (value: Spreadsheets[SheetName][FieldName]) => CSSProperties;
  formatExpr?: (value: Spreadsheets[SheetName][FieldName]) => string;
  unformatExpr?: (value: string) => unknown;
  privacyFilter?: ComponentProps<
    typeof ConditionalPrivacyFilter
  >['privacyFilter'];
};

export type SheetCellProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = ComponentProps<typeof Cell> & {
  valueProps: SheetCellValueProps<SheetName, FieldName>;
  inputProps?: Omit<
    ComponentProps<typeof InputValue>,
    'value' | 'onUpdate' | 'onBlur'
  > & {
    onBlur?: () => void;
  };
  onSave?: (value) => void;
  textAlign?: CSSProperties['textAlign'];
};
export function SheetCell<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  valueProps,
  valueStyle,
  inputProps,
  textAlign,
  onSave,
  ...props
}: SheetCellProps<SheetName, FieldName>) {
  const {
    binding,
    type,
    getValueStyle,
    formatExpr,
    unformatExpr,
    privacyFilter,
  } = valueProps;

  const sheetValue = useSheetValue(binding, () => {
    // "close" the cell if it's editing
    if (props.exposed && inputProps && inputProps.onBlur) {
      inputProps.onBlur();
    }
  });
  const format = useFormat();

  return (
    <Cell
      valueStyle={
        getValueStyle
          ? { ...valueStyle, ...getValueStyle(sheetValue) }
          : valueStyle
      }
      textAlign={textAlign}
      {...props}
      value={String(sheetValue ?? '')}
      formatter={value =>
        props.formatter ? props.formatter(value, type) : format(value, type)
      }
      privacyFilter={
        privacyFilter != null
          ? privacyFilter
          : type === 'financial'
            ? true
            : undefined
      }
      data-cellname={sheetValue}
    >
      {() => {
        return (
          <InputValue
            value={formatExpr ? formatExpr(sheetValue) : sheetValue.toString()}
            onUpdate={(value, isEdited) => {
              if (!unformatExpr) {
                onSave(value);
              } else {
                // Untouched text can be rounded (hidden decimals); keep the
                // exact value
                onSave(isEdited ? unformatExpr(value) : sheetValue);
              }
            }}
            {...inputProps}
            style={{ textAlign, ...(inputProps?.style || {}) }}
          />
        );
      }}
    </Cell>
  );
}

type TableHeaderProps = Omit<ComponentProps<typeof Row>, 'headers'> & {
  headers?: Array<ComponentProps<typeof Cell>>;
};
export function TableHeader({
  headers,
  children,
  ...rowProps
}: TableHeaderProps) {
  return (
    <View
      style={{
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <Row
        collapsed
        {...rowProps}
        style={{
          color: theme.tableHeaderText,
          backgroundColor: theme.tableHeaderBackground,
          zIndex: 200,
          fontWeight: 500,
          ...rowProps.style,
        }}
      >
        {headers
          ? headers.map(header => {
              return (
                <Cell
                  key={header.name}
                  value={header.name}
                  width={header.width}
                  style={header.style}
                  valueStyle={header.valueStyle}
                />
              );
            })
          : children}
      </Row>
    </View>
  );
}

type SelectedItemsButtonProps<Name extends string> = {
  id: string;
  name: ((count: number) => string) | string;
  items: MenuItem<Name>[];
  onSelect: (name: Name, items: string[]) => void;
  footer?: ReactNode;
};

export function SelectedItemsButton<Name extends string>({
  id,
  name,
  items,
  onSelect,
  footer,
}: SelectedItemsButtonProps<Name>) {
  const selectedItems = useSelectedItems();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  if (selectedItems.size === 0) {
    return null;
  }

  const buttonLabel =
    typeof name === 'function' ? name(selectedItems.size) : name;

  return (
    <View style={{ flexShrink: 0 }}>
      <Button
        ref={triggerRef}
        variant="bare"
        style={{ color: theme.pageTextPositive }}
        onPress={() => setMenuOpen(true)}
        data-testid={id + '-select-button'}
      >
        <SvgExpandArrow
          width={8}
          height={8}
          style={{ marginRight: 5, color: theme.pageText }}
        />
        {buttonLabel}
      </Button>

      <Popover
        triggerRef={triggerRef}
        style={{
          width: 200,
          padding: 0,
          backgroundColor: theme.menuBackground,
        }}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        data-testid={id + '-select-tooltip'}
      >
        <Menu
          onMenuSelect={name => {
            onSelect(name, [...selectedItems]);
            setMenuOpen(false);
          }}
          items={items}
          footer={footer}
        />
      </Popover>
    </View>
  );
}

const rowStyle: CSSProperties = {
  position: 'absolute',
  willChange: 'transform',
  width: '100%',
};

export type TableHandleRef<T extends TableItem = TableItem> = {
  scrollTo: (id: T['id'], alignment?: string) => void;
  scrollToTop: () => void;
  getScrolledItem: () => T['id'];
  setRowAnimation: (flag) => void;
  edit(id: number, field: string, shouldScroll: boolean): void;
  anchor(): void;
  unanchor(): void;
  isAnchored(): boolean;
};

type TableWithNavigatorProps<T extends TableItem = TableItem> =
  TableProps<T> & {
    fields: string[] | ((item?: T) => string[]);
  };

export function TableWithNavigator<T extends TableItem = TableItem>({
  fields,
  ...props
}: TableWithNavigatorProps<T>) {
  const navigator = useTableNavigator(props.items, fields);
  return <Table {...props} navigator={navigator} />;
}

type TableItem = { id: number | string };

export type TableProps<T extends TableItem = TableItem> = {
  items: T[];
  count?: number;
  headers?: ReactNode | TableHeaderProps['headers'];
  contentHeader?: ReactNode;
  loading?: boolean;
  rowHeight?: number;
  backgroundColor?: string;
  renderItem: (arg: {
    item: T;
    editing: boolean;
    focusedField: string | null;
    onEdit: TableNavigator<T>['onEdit'];
    onExit?: () => void;
    index: number;
    position: number;
  }) => ReactNode;
  renderEmpty?: ReactNode | (() => ReactNode);
  getItemKey?: (index: number) => T['id'];
  loadMore?: () => void;
  style?: CSSProperties;
  navigator?: ReturnType<typeof useTableNavigator<T>>;
  listContainerRef?: RefObject<HTMLDivElement>;
  onScroll?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  isSelected?: (id: T['id']) => boolean;
  saveScrollWidth?: (parent, child) => void;
};

export const Table = forwardRef(
  (
    {
      items,
      count,
      headers,
      contentHeader,
      loading,
      rowHeight = ROW_HEIGHT,
      backgroundColor = theme.tableBackground,
      renderItem,
      renderEmpty,
      getItemKey,
      loadMore,
      style,
      navigator,
      onScroll,
      isSelected,
      saveScrollWidth,
      listContainerRef,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const hasNavigator = navigator != null;
    if (!navigator) {
      navigator = {
        cursor: null,
        isEditing: false,
        beginEdit: () => {},
        exitEdit: () => {},
        onEdit: () => {},
        onEditFirstField: () => {},
        onSelectFirstField: () => {},
        editingId: null,
        focusedField: null,
        getNavigatorProps: (props =>
          props) as TableNavigator<TableItem>['getNavigatorProps'],
      };
    }

    const {
      onEdit,
      onEditFirstField,
      onSelectFirstField,
      cursor,
      isEditing,
      exitEdit,
      editingId,
      focusedField,
      getNavigatorProps,
    } = navigator;
    // Tables that don't pass isSelected still keep a checked row's highlight
    const checkedItems = useSelectedItems();
    const focusExit = useRef<HTMLDivElement>(null);
    const list = useRef(null);
    const listContainerInnerRef = useRef<HTMLDivElement>(null);
    const listContainer = listContainerRef || listContainerInnerRef;
    const scrollContainer = useRef(null);
    const initialScrollTo = useRef(null);
    const listInitialized = useRef(false);

    useImperativeHandle(ref, () => ({
      scrollTo: (id, alignment = 'smart') => {
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
          if (!list.current) {
            // If the table hasn't been laid out yet, we need to wait for
            // that to happen before we can scroll to something
            initialScrollTo.current = index;
          } else {
            list.current.scrollToItem(index, alignment);
          }
        }
      },

      scrollToTop: () => {
        list.current?.scrollTo(0);
      },

      getScrolledItem: () => {
        if (scrollContainer.current) {
          const offset = scrollContainer.current.scrollTop;
          const index = list.current.getStartIndexForOffset(offset);
          return items[index].id;
        }
        return 0;
      },

      setRowAnimation: flag => {
        list.current?.setRowAnimation(flag);
      },

      edit(id, field, shouldScroll) {
        onEdit(id, field);

        if (id && shouldScroll) {
          // @ts-expect-error this should not be possible
          ref.scrollTo(id);
        }
      },

      anchor() {
        list.current?.anchor();
      },

      unanchor() {
        list.current?.unanchor();
      },

      isAnchored() {
        return list.current && list.current.isAnchored();
      },
    }));

    function saveScrollDelayed() {
      saveScrollWidth(
        scrollContainer.current?.offsetParent
          ? scrollContainer.current?.offsetParent.clientWidth
          : 0,
        scrollContainer.current ? scrollContainer.current.clientWidth : 0,
      );
    }

    // Keep the selected cell in view as the arrow keys move it
    const selectedId = isEditing ? undefined : cursor?.id;
    const scrollToSelected = useEffectEvent((id: TableItem['id']) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        list.current?.scrollToItem(index, 'smart');
      }
    });
    useEffect(() => {
      if (selectedId != null) {
        scrollToSelected(selectedId);
      }
    }, [selectedId]);

    useLayoutEffect(() => {
      // We wait for the list to mount because AutoSizer needs to run
      // before it's mounted
      if (!listInitialized.current && listContainer.current) {
        // Animation is on by default
        list.current?.setRowAnimation(true);
        listInitialized.current = true;
      }

      if (scrollContainer.current && saveScrollWidth) {
        const timeout = setTimeout(saveScrollDelayed, 200);
        // Without this, the timer can fire after unmount and call setState
        // on a dead component (crashes test teardown)
        return () => clearTimeout(timeout);
      }
    });

    function renderRow({ index, style, key }) {
      const item = items[index];
      const editing = editingId === item.id;
      const selected = isSelected && isSelected(item.id);
      // Compare against a real cursor: some tables have rows without ids
      const selectedField =
        !isEditing && cursor != null && cursor.id === item.id
          ? cursor.field
          : undefined;

      const row = renderItem({
        item,
        editing,
        focusedField: editing ? focusedField : null,
        onEdit,
        onExit: exitEdit,
        index,
        position: style.top,
      });

      // TODO: Need to also apply zIndex if item is selected
      // * Port over ListAnimation to Table
      // * Move highlighted functionality into here
      return (
        <View
          key={key}
          style={{
            ...rowStyle,
            zIndex: editing || selected ? 101 : 'auto',
            transform: 'translateY(var(--pos))',
            backgroundColor,
            ...(selectedField != null &&
              selectedCellStyle(
                selectedField,
                !!selected || !!checkedItems?.has(String(item.id)),
              )),
          }}
          nativeStyle={{ '--pos': `${style.top - 1}px` }}
          data-focus-key={item.id}
          data-cursor-field={selectedField}
        >
          {row}
        </View>
      );
    }

    function getScrollOffset(height, index) {
      return (
        index * (rowHeight - 1) +
        (rowHeight - 1) / 2 -
        height / 2 +
        (rowHeight - 1) * 2
      );
    }

    function onItemsRendered({ overscanStopIndex }) {
      if (loadMore && overscanStopIndex > items.length - 100) {
        loadMore();
      }
    }

    function getEmptyContent(empty) {
      if (empty == null) {
        return null;
      } else if (typeof empty === 'function') {
        return empty();
      }

      return (
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            fontStyle: 'italic',
            color: theme.tableText,
            flex: 1,
          }}
        >
          {empty}
        </View>
      );
    }

    if (loading) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor,
          }}
        >
          <AnimatedLoading width={25} color={theme.tableText} />
        </View>
      );
    }

    const isEmpty = (count || items.length) === 0;

    const navigatorProps = getNavigatorProps(props);

    function onContainerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
      onKeyDown?.(e);
      if (e.isPropagationStopped()) {
        return;
      }

      navigatorProps.onKeyDown?.(e);
      onEnterOrExit(e);
    }

    function onEnterOrExit(e: KeyboardEvent<HTMLDivElement>) {
      if (!hasNavigator) {
        return;
      }

      // The navigator owns keys while editing or while a cell is selected
      if (
        editingId != null ||
        e.target !== e.currentTarget ||
        e.isDefaultPrevented()
      ) {
        return;
      }

      if (e.key === 'Tab') {
        if (!e.shiftKey) {
          focusExit.current?.focus({ preventScroll: true });
        }
      } else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'j') {
        // Nothing selected yet: start from the first visible row. Enter
        // edits it (#9494); arrows only select it
        const index =
          list.current && scrollContainer.current
            ? list.current.getStartIndexForOffset(
                scrollContainer.current.scrollTop,
              )
            : 0;
        const item = items[index];
        if (item != null) {
          e.preventDefault();
          list.current?.scrollToItem(index, 'smart');
          if (e.key === 'Enter') {
            onEditFirstField(item.id);
          } else {
            onSelectFirstField(item.id);
          }
        }
      }
    }

    return (
      <View
        style={{
          flex: 1,
          outline: 'none',
          overflow: 'hidden',
          // The selected cell's outline already shows where focus is
          ...(selectedId == null && {
            ':focus-visible::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              border: `2px solid ${theme.formInputBorderSelected}`,
              pointerEvents: 'none',
              zIndex: 201,
            },
          }),
          ...style,
        }}
        tabIndex={0}
        {...navigatorProps}
        onKeyDown={onContainerKeyDown}
        data-testid="table"
      >
        {headers && (
          <TableHeader
            height={rowHeight}
            {...(Array.isArray(headers) ? { headers } : { children: headers })}
          />
        )}
        <View
          style={{
            flex: `1 1 ${rowHeight * Math.max(2, items.length)}px`,
            backgroundColor,
          }}
        >
          {isEmpty ? (
            getEmptyContent(renderEmpty)
          ) : (
            <AutoSizer
              renderProp={({ width = 0, height = 0 }) => {
                if (width === 0 || height === 0) {
                  return null;
                }

                return (
                  <AvoidRefocusScrollProvider>
                    <FixedSizeList
                      ref={list}
                      header={contentHeader}
                      innerRef={listContainer}
                      outerRef={scrollContainer}
                      width={width}
                      height={height}
                      renderRow={renderRow}
                      itemCount={count || items.length}
                      itemSize={rowHeight - 1}
                      itemKey={
                        getItemKey || ((index: number) => items[index].id)
                      }
                      indexForKey={key =>
                        items.findIndex(item => item.id === key)
                      }
                      initialScrollOffset={
                        initialScrollTo.current
                          ? getScrollOffset(height, initialScrollTo.current)
                          : 0
                      }
                      overscanCount={5}
                      onItemsRendered={onItemsRendered}
                      onScroll={onScroll}
                    />
                  </AvoidRefocusScrollProvider>
                );
              }}
            />
          )}
        </View>
        {hasNavigator && (
          <View
            innerRef={focusExit}
            tabIndex={-1}
            style={{ outline: 'none' }}
          />
        )}
      </View>
    );
  },
) as <T extends TableItem>(
  props: TableProps<T> & { ref?: Ref<TableHandleRef<T>> },
) => ReactElement;

// @ts-expect-error fix me
Table.displayName = 'Table';

// Highlights the row and outlines the selected cell. Rows paint their own
// background, so this targets them from the wrapper.
function selectedCellStyle(field: string, isChecked: boolean): CSSProperties {
  const cell = `& [data-testid="${field}"]`;
  return {
    // A checked row keeps its own highlight
    ...(!isChecked && {
      '& [data-testid="row"]': {
        backgroundColor: theme.tableRowBackgroundHover,
      },
    }),
    [cell]: {
      boxShadow: `inset 0 0 0 2px ${theme.formInputBorderSelected}`,
    },
    [`${cell} .hover-visible`]: { opacity: 1 },
  };
}

export type TableCursor<T extends TableItem = TableItem> = {
  id: T['id'];
  field?: string;
} | null;

export type TableNavigator<T extends TableItem = TableItem> = {
  cursor: TableCursor<T>;
  isEditing: boolean;
  beginEdit: (id: T['id'], field?: string) => void;
  exitEdit: () => void;
  onEdit: (id: T['id'] | null, field?: string) => void;
  onEditFirstField: (id: T['id']) => void;
  onSelectFirstField: (id: T['id']) => void;
  editingId: T['id'] | null;
  focusedField: string | null;
  getNavigatorProps: <P extends object>(
    userProps?: P,
  ) => P & {
    innerRef: RefObject<HTMLDivElement | null>;
    onKeyDown: (e: KeyboardEvent) => void;
    onBlur: (e: FocusEvent) => void;
  };
};

type Direction = 'left' | 'right' | 'up' | 'down';

export function useTableNavigator<T extends TableItem>(
  data: T[],
  fields: string[] | ((item?: T) => string[]),
): TableNavigator<T> {
  const getFields = typeof fields !== 'function' ? () => fields : fields;
  const [cursorState, setCursor] = useState<TableCursor<T>>(null);
  // A row that leaves the data (filtered out, deleted) drops the selected
  // cell; it comes back if the row does
  const cursorItem =
    cursorState && data.find(item => item.id === cursorState.id);
  const cursor = cursorItem ? cursorState : null;
  const [isEditing, setIsEditing] = useState(false);
  // Its editor closes too, so the keys aren't swallowed by a cell that isn't
  // there, and it doesn't reopen by itself if the row comes back
  if (isEditing && cursorState && !cursorItem) {
    setIsEditing(false);
  }
  const containerRef = useRef<HTMLDivElement>(null);
  const isFlashing = useRef(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // See `onBlur` for why we need this
  const modalState = useModalState();
  const modalStackLength = useRef(modalState.modalStack.length);

  // Escape clears the checked rows and Space toggles them. Both are null
  // outside a SelectedProvider (e.g. the budget grid), where they do nothing.
  const selectedItems = useSelectedItems();
  const selectedDispatch = useSelectedDispatch();

  // Any edit or exit supersedes a pending flash, so it can't reopen a cell
  const cancelFlash = useCallback(() => {
    clearTimeout(flashTimer.current);
    flashTimer.current = undefined;
    isFlashing.current = false;
  }, []);

  useEffect(() => cancelFlash, [cancelFlash]);

  // A flash for a row that left can't reopen it if the row comes back
  useEffect(() => {
    if (cursorState && !cursorItem) {
      cancelFlash();
    }
  }, [cursorState, cursorItem, cancelFlash]);

  const beginEdit = useCallback(
    (id: T['id'], field?: string) => {
      cancelFlash();
      setCursor({ id, field });
      setIsEditing(true);
    },
    [cancelFlash],
  );

  const exitEdit = useCallback(() => {
    cancelFlash();
    setIsEditing(false);
    containerRef.current?.focus();
  }, [cancelFlash]);

  const onEdit = useCallback(
    (id: T['id'] | null, field?: string) => {
      if (id == null) {
        exitEdit();
      } else {
        beginEdit(id, field);
      }
    },
    [beginEdit, exitEdit],
  );

  const editingId = isEditing && cursor ? cursor.id : null;
  const focusedField = cursor?.field ?? null;

  function getFirstField(id: T['id']) {
    const item = data.find(item => item.id === id);
    return item ? getFields(item)[0] : undefined;
  }

  function onEditFirstField(id: T['id']) {
    const field = getFirstField(id);
    if (field != null) {
      beginEdit(id, field);
    }
  }

  function flashInput() {
    // Force the container to be focused which suppresses the "space
    // pages down" behavior. If we don't do this and the user presses
    // up + space down quickly while nothing is focused, it would page
    // down.
    containerRef.current?.focus();
    const currentCursor = cursor;
    setIsEditing(false);

    if (currentCursor) {
      cancelFlash();
      isFlashing.current = true;
      flashTimer.current = setTimeout(() => {
        beginEdit(currentCursor.id, currentCursor.field);
      }, 100);
    }
  }

  // The cell next to the cursor, or null at the edge of the table. Left and
  // right wrap to the neighbouring row; up and down skip rows without the
  // cursor's field.
  function findNeighbor(
    dir: Direction,
  ): { id: T['id']; field: string | undefined } | null {
    if (!cursor) {
      return null;
    }
    const idx = data.findIndex(item => item.id === cursor.id);

    if (dir === 'up' || dir === 'down') {
      const step = dir === 'up' ? -1 : 1;
      for (let i = idx + step; i >= 0 && i < data.length; i += step) {
        if (getFields(data[i]).includes(cursor.field)) {
          return { id: data[i].id, field: cursor.field };
        }
      }
      return null;
    }

    const step = dir === 'left' ? -1 : 1;
    const fields = getFields(data[idx]);
    const fieldIdx = fields.indexOf(cursor.field) + step;
    if (fieldIdx >= 0 && fieldIdx < fields.length) {
      return { id: cursor.id, field: fields[fieldIdx] };
    }
    const nextItem = idx + step >= 0 ? data[idx + step] : undefined;
    if (!nextItem) {
      return null;
    }
    const nextFields = getFields(nextItem);
    return {
      id: nextItem.id,
      field: step < 0 ? nextFields[nextFields.length - 1] : nextFields[0],
    };
  }

  // Moves the edit cursor; at the edge of the table the input flashes
  function moveEdit(dir: Direction) {
    if (!cursor) {
      return;
    }
    const next = findNeighbor(dir);
    if (next) {
      beginEdit(next.id, next.field);
    } else {
      flashInput();
    }
  }

  // Highlights a cell without editing it (the "selected" state). The table
  // keeps keyboard focus, so arrows move the selection and Enter edits it.
  function selectCell(id: T['id'], field?: string) {
    setCursor({ id, field });
    setIsEditing(false);
  }

  function onSelectFirstField(id: T['id']) {
    const field = getFirstField(id);
    if (field != null) {
      selectCell(id, field);
    }
  }

  // Like moveEdit, but without editing, and it stops at the table's edge
  function moveSelection(dir: Direction) {
    const next = findNeighbor(dir);
    if (next) {
      selectCell(next.id, next.field);
    }
  }

  // Keys while a cell is selected (not edited) and the table has focus
  function onSelectedKeyDown(e: KeyboardEvent): boolean {
    if (!cursor) {
      return false;
    }
    switch (e.key) {
      case 'ArrowUp':
      case 'k':
        moveSelection('up');
        return true;
      case 'ArrowDown':
      case 'j':
        moveSelection('down');
        return true;
      case 'ArrowLeft':
        moveSelection('left');
        return true;
      case 'ArrowRight':
        moveSelection('right');
        return true;
      case 'Tab':
        moveSelection(e.shiftKey ? 'left' : 'right');
        return true;
      case 'Enter':
        beginEdit(cursor.id, cursor.field);
        return true;
      case ' ':
        // Only rows with a checkbox can be checked (not transfer payees)
        if (
          !selectedDispatch ||
          !cursorItem ||
          !getFields(cursorItem).includes('select')
        ) {
          return false;
        }
        selectedDispatch({
          type: 'select',
          id: String(cursor.id),
          isRangeSelect: e.shiftKey,
        });
        return true;
      default:
        return false;
    }
  }

  // Each press peels off one layer: the edit, then the checked rows, then
  // the selected cell
  function onEscape(e: KeyboardEvent): boolean {
    if (isInCell()) {
      exitEdit();
      return true;
    }
    if (selectedItems != null && selectedItems.size > 0) {
      selectedDispatch?.({ type: 'select-none' });
      return true;
    }
    if (cursor && e.target === e.currentTarget) {
      setCursor(null);
      return true;
    }
    return false;
  }

  // Keys pressed while no cell is active belong to the Table (#9494)
  function isInCell() {
    return isEditing || isFlashing.current;
  }

  function getNavigatorProps<
    P extends { onKeyDown?: (e: KeyboardEvent) => void },
  >(userProps?: P) {
    return {
      ...userProps,

      innerRef: containerRef,

      onKeyDown: (e: KeyboardEvent) => {
        userProps?.onKeyDown?.(e);
        if (e.isPropagationStopped()) {
          return;
        }

        if (
          !isInCell() &&
          e.target === e.currentTarget &&
          onSelectedKeyDown(e)
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        switch (e.key) {
          case 'ArrowUp':
          case 'k':
          case 'ArrowDown':
          case 'j':
            // While editing, arrows never move between rows, whether the
            // cell is an input or a button such as the checkbox; Escape to
            // the selected state first. Only stop a focused button from
            // scrolling the list.
            if (isInCell() && !(e.target instanceof HTMLInputElement)) {
              e.preventDefault();
            }
            break;

          case 'Enter':
          case 'Tab':
            if (!isInCell()) {
              break;
            }

            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Enter') {
              moveEdit(e.shiftKey ? 'up' : 'down');
            } else {
              moveEdit(e.shiftKey ? 'left' : 'right');
            }
            break;

          case 'Escape':
            if (onEscape(e)) {
              e.preventDefault();
              e.stopPropagation();
            }
            break;
          default:
        }
      },

      onBlur: (e: FocusEvent) => {
        // We want to hide the editing field if the user clicked away
        // from the table. We use `relatedTarget` to figure out where
        // the focus is going, and if it's nothing (the user clicked
        // somewhere that doesn't have an editable field) or if it's
        // anything outside of the table, clear editing.
        //
        // Also important: only do this if the app is focused. The
        // blur event is fired when the app loses focus and we don't
        // want to hide the input.

        // The last tricky edge case: we don't want to blur if a new
        // modal just opened. This way the field still shows an
        // input, and it will be refocused when the modal closes.
        const prevNumModals = modalStackLength.current;
        const numModals = modalState.modalStack.length;

        if (
          document.hasFocus() &&
          (e.relatedTarget == null ||
            !containerRef.current?.contains(e.relatedTarget) ||
            containerRef.current === e.relatedTarget) &&
          prevNumModals === numModals
        ) {
          // Let the clicked control receive focus. exitEdit also focuses
          // this table, which is appropriate for Escape but not for blur.
          setIsEditing(false);
          // Focus moving to the table itself keeps the selected cell;
          // leaving the table drops it so no stale highlight is left
          if (containerRef.current !== e.relatedTarget) {
            cancelFlash();
            setCursor(null);
          }
        }
      },
    };
  }

  return {
    cursor,
    isEditing,
    beginEdit,
    exitEdit,
    onEdit,
    onEditFirstField,
    onSelectFirstField,
    editingId,
    focusedField,
    getNavigatorProps,
  };
}
