import React, {
  createContext,
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useContext,
  useMemo,
  type ComponentProps,
  type ReactNode,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { useStore } from 'react-redux';
import AutoSizer from 'react-virtualized-auto-sizer';

import { type CSSProperties } from 'glamor';

import {
  AvoidRefocusScrollProvider,
  useProperFocus,
} from '../hooks/useProperFocus';
import { useSelectedItems } from '../hooks/useSelected';
import AnimatedLoading from '../icons/AnimatedLoading';
import DeleteIcon from '../icons/v0/Delete';
import ExpandArrow from '../icons/v0/ExpandArrow';
import Checkmark from '../icons/v1/Checkmark';
import { styles, colors } from '../style';

import {
  View,
  Text,
  Button,
  Input,
  Tooltip,
  IntersectionBoundary,
  Menu,
} from './common';
import FixedSizeList from './FixedSizeList';
import { KeyHandlers } from './KeyHandlers';
import format from './spreadsheet/format';
import SheetValue from './spreadsheet/SheetValue';

export const ROW_HEIGHT = 32;
const TABLE_BACKGROUND_COLOR = colors.n11;

function fireBlur(onBlur, e) {
  if (document.hasFocus()) {
    // We only fire the blur event if the app is still focused
    // because the blur event is fired when the app goes into
    // the background and we want to ignore that
    onBlur && onBlur(e);
  } else {
    // Otherwise, stop React from bubbling this event and swallow it
    e.stopPropagation();
  }
}

const CellContext = createContext({
  backgroundColor: 'white',
  borderColor: colors.n9,
});

type CellProviderProps = {
  backgroundColor: string;
  borderColor: string;
  children: ReactNode;
};
function CellProvider({
  backgroundColor,
  borderColor,
  children,
}: CellProviderProps) {
  let value = useMemo(
    () => ({
      backgroundColor,
      borderColor,
    }),
    [backgroundColor, borderColor],
  );

  return <CellContext.Provider value={value}>{children}</CellContext.Provider>;
}

type FieldProps = ComponentProps<typeof View> & {
  width: number | 'flex';
  name?: string;
  borderColor?: string;
  truncate?: boolean;
  contentStyle?: CSSProperties;
};
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    width,
    name,
    borderColor: oldBorderColor,
    truncate = true,
    children,
    style,
    contentStyle,
    ...props
  },
  ref,
) {
  let { backgroundColor, borderColor } = useContext(CellContext);

  // TODO: Get rid of this. Go through and remove all the places where
  // the border color is manually passed in.
  if (oldBorderColor) {
    borderColor = oldBorderColor;
  }

  return (
    <View
      innerRef={ref}
      {...props}
      style={[
        width === 'flex' ? { flex: 1, flexBasis: 0 } : { width },
        {
          position: 'relative',
          borderTopWidth: borderColor ? 1 : 0,
          borderBottomWidth: borderColor ? 1 : 0,
          borderColor,
          backgroundColor,
        },
        styles.smallText,
        style,
      ]}
      data-testid={name}
    >
      {/* This is wrapped so that the padding is not taken into
          account with the flex width (which aligns it with the Cell
          component) */}
      <View
        style={[
          {
            flex: 1,
            padding: '0 5px',
            justifyContent: 'center',
          },
          contentStyle,
        ]}
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

export function UnexposedCellContent({
  value,
  formatter,
}: Pick<CellProps, 'value' | 'formatter'>) {
  return (
    <Text
      style={{
        flexGrow: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {formatter ? formatter(value) : value}
    </Text>
  );
}

type CellProps = Omit<ComponentProps<typeof View>, 'children' | 'value'> & {
  formatter?: (value: string, type?: unknown) => string;
  focused?: boolean;
  textAlign?: string;
  borderColor?: string;
  plain?: boolean;
  exposed?: boolean;
  children?: ReactNode | (() => ReactNode);
  unexposedContent?: ReactNode;
  value?: string;
  valueStyle?: CSSProperties;
  onExpose?: (name: string) => void;
};
export function Cell({
  width,
  name,
  exposed,
  focused,
  value,
  formatter,
  textAlign,
  onExpose,
  borderColor: oldBorderColor,
  children,
  plain,
  style,
  valueStyle,
  unexposedContent,
  ...viewProps
}: CellProps) {
  let mouseCoords = useRef(null);
  let viewRef = useRef(null);

  let { backgroundColor, borderColor } = useContext(CellContext);

  useProperFocus(viewRef, focused !== undefined ? focused : exposed);

  // TODO: Get rid of this. Go through and remove all the places where
  // the border color is manually passed in.
  if (oldBorderColor) {
    borderColor = oldBorderColor;
  }

  const widthStyle = width === 'flex' ? { flex: 1, flexBasis: 0 } : { width };
  const cellStyle = {
    position: 'relative',
    textAlign: textAlign || 'left',
    justifyContent: 'center',
    borderTopWidth: borderColor ? 1 : 0,
    borderBottomWidth: borderColor ? 1 : 0,
    borderColor,
    backgroundColor,
  };

  return (
    <View
      innerRef={viewRef}
      style={[widthStyle, cellStyle, style]}
      className="animated-cell"
      {...viewProps}
      data-testid={name}
    >
      {plain ? (
        children
      ) : exposed ? (
        // @ts-expect-error Missing props refinement
        children()
      ) : (
        <View
          style={[
            {
              flexDirection: 'row',
              flex: 1,
              padding: '0 5px',
              alignItems: 'center',
            },
            styles.smallText,
            valueStyle,
          ]}
          // Can't use click because we only want to expose the cell if
          // the user does a direct click, not if they also drag the
          // mouse to select something
          onMouseDown={e => (mouseCoords.current = [e.clientX, e.clientY])}
          // When testing, allow the click handler to be used instead
          onClick={
            global.IS_TESTING
              ? () => onExpose && onExpose(name)
              : e => {
                  if (
                    mouseCoords.current &&
                    Math.abs(e.clientX - mouseCoords.current[0]) < 5 &&
                    Math.abs(e.clientY - mouseCoords.current[1]) < 5
                  ) {
                    onExpose && onExpose(name);
                  }
                }
          }
        >
          {unexposedContent || (
            <UnexposedCellContent value={value} formatter={formatter} />
          )}
        </View>
      )}
    </View>
  );
}

type RowProps = ComponentProps<typeof View> & {
  backgroundColor?: string;
  borderColor?: string;
  inset?: number;
  collapsed?: boolean;
  focused?: boolean;
  highlighted?: boolean;
};
export function Row({
  backgroundColor = 'white',
  borderColor = colors.border,
  inset = 0,
  collapsed,
  focused,
  highlighted,
  children,
  height,
  style,
  ...nativeProps
}: RowProps) {
  let [shouldHighlight, setShouldHighlight] = useState(false);
  let prevHighlighted = useRef(false);
  let rowRef = useRef(null);
  let timer = useRef(null);

  useEffect(() => {
    if (highlighted && !prevHighlighted.current && rowRef.current) {
      rowRef.current.classList.add('animated');
      setShouldHighlight(true);

      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setShouldHighlight(false);

        timer.current = setTimeout(() => {
          if (rowRef.current) {
            rowRef.current.classList.remove('animated');
          }
        }, 500);
      }, 500);
    }
  }, [highlighted]);

  useEffect(() => {
    prevHighlighted.current = highlighted;
  });

  return (
    <CellProvider
      backgroundColor={shouldHighlight ? colors.y9 : backgroundColor}
      borderColor={shouldHighlight ? colors.y8 : borderColor}
    >
      <View
        innerRef={rowRef}
        style={[
          {
            flexDirection: 'row',
            height: height || ROW_HEIGHT,
            flex: '0 0 ' + (height || ROW_HEIGHT) + 'px',
            userSelect: 'text',
            '&.animated .animated-cell': {
              transition: '.7s background-color',
            },
          },
          collapsed && { marginTop: -1 },
          style,
        ]}
        data-testid="row"
        {...nativeProps}
      >
        {inset !== 0 && <Field width={inset} />}
        {children}
        {inset !== 0 && <Field width={inset} />}
      </View>
    </CellProvider>
  );
}

const inputCellStyle = {
  backgroundColor: 'white',
  padding: '5px 3px',
  margin: '0 1px',
};

const readonlyInputStyle = {
  backgroundColor: 'transparent',
  '::selection': { backgroundColor: '#d9d9d9' },
};

type InputValueProps = ComponentProps<typeof Input> & {
  value: string;
};
function InputValue({
  value: defaultValue,
  onUpdate,
  onBlur,
  ...props
}: InputValueProps) {
  let [value, setValue] = useState(defaultValue);

  function onBlur_(e) {
    onUpdate && onUpdate(value);
    onBlur && fireBlur(onBlur, e);
  }

  function onKeyDown(e) {
    // Only enter and tab to escape (which allows the user to move
    // around)
    if (e.key !== 'Enter' && e.key !== 'Tab') {
      e.stopPropagation();
    }

    if (e.key === 'Escape') {
      if (value !== defaultValue) {
        setValue(defaultValue);
      }
    } else if (shouldSaveFromKey(e)) {
      onUpdate && onUpdate(value);
    }
  }

  return (
    <Input
      {...props}
      value={value}
      onUpdate={text => setValue(text)}
      onBlur={onBlur_}
      onKeyDown={onKeyDown}
      style={[
        inputCellStyle,
        props.readOnly ? readonlyInputStyle : null,
        props.style,
      ]}
    />
  );
}

type InputCellProps = ComponentProps<typeof Cell> & {
  inputProps: ComponentProps<typeof InputValue>;
  onUpdate: ComponentProps<typeof InputValue>['onUpdate'];
  onBlur: ComponentProps<typeof InputValue>['onBlur'];
  textAlign?: string;
  error?: ReactNode;
};
export function InputCell({
  inputProps,
  onUpdate,
  onBlur,
  textAlign,
  error,
  ...props
}: InputCellProps) {
  return (
    <Cell textAlign={textAlign} {...props}>
      {() => (
        <>
          <InputValue
            value={props.value}
            onUpdate={onUpdate}
            onBlur={onBlur}
            style={[{ textAlign }, inputProps && inputProps.style]}
            {...inputProps}
          />
          {error && (
            <Tooltip
              key="error"
              targetHeight={ROW_HEIGHT}
              width={180}
              position="bottom-left"
            >
              {error}
            </Tooltip>
          )}
        </>
      )}
    </Cell>
  );
}

function shouldSaveFromKey(e) {
  switch (e.key) {
    case 'Tab':
    case 'Enter':
      e.preventDefault();
      return true;
    default:
  }
}

type CustomCellRenderProps = {
  onBlur: (ev: UIEvent<unknown>) => void;
  onKeyDown: (ev: KeyboardEvent<unknown>) => void;
  onUpdate: (value: string) => void;
  onSave: (value: string) => void;
  shouldSaveFromKey: (ev: KeyboardEvent<unknown>) => boolean;
  inputStyle: CSSProperties;
};
type CustomCellProps = Omit<ComponentProps<typeof Cell>, 'children'> & {
  children: (props: CustomCellRenderProps) => ReactNode;
  onUpdate: (value: string) => void;
  onBlur: (ev: UIEvent<unknown>) => void;
};
export function CustomCell({
  value: defaultValue,
  children,
  onUpdate,
  onBlur,
  ...props
}: CustomCellProps) {
  let [value, setValue] = useState(defaultValue);
  let [prevDefaultValue, setPrevDefaultValue] = useState(defaultValue);

  if (prevDefaultValue !== defaultValue) {
    setValue(defaultValue);
    setPrevDefaultValue(defaultValue);
  }

  function onBlur_(e) {
    // Only save on blur if the app is focused. Blur events fire when
    // the app unfocuses, and it's unintuitive to save the value since
    // the input will be focused again when the app regains focus
    if (document.hasFocus()) {
      onUpdate && onUpdate(value);
      fireBlur(onBlur, e);
    }
  }

  function onKeyDown(e) {
    if (shouldSaveFromKey(e)) {
      onUpdate && onUpdate(value);
    }
  }

  return (
    <Cell {...props} value={defaultValue}>
      {() =>
        children({
          onBlur: onBlur_,
          onKeyDown,
          onUpdate: val => setValue(val),
          onSave: val => {
            setValue(val);
            onUpdate && onUpdate(val);
          },
          shouldSaveFromKey,
          inputStyle: inputCellStyle,
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
      style={[{ alignItems: 'center', userSelect: 'none' }, style]}
      onClick={e => {
        e.stopPropagation();
        onDelete && onDelete();
      }}
    >
      {() => <DeleteIcon width={7} height={7} />}
    </Cell>
  );
}

type CellButtonProps = {
  style?: CSSProperties;
  disabled?: boolean;
  clickBehavior?: string;
  onSelect?: (e) => void;
  onEdit?: () => void;
  children: ReactNode;
};
export const CellButton = forwardRef<HTMLDivElement, CellButtonProps>(
  ({ style, disabled, clickBehavior, onSelect, onEdit, children }, ref) => {
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
        className="cell-button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'x' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) {
              onSelect && onSelect(e);
            }
          }
        }}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            cursor: 'default',
            transition: 'box-shadow .15s',
            ':focus': {
              outline: 0,
              boxShadow: `0 0 0 3px white, 0 0 0 5px ${colors.b5}`,
            },
          },
          style,
        ]}
        onFocus={() => onEdit && onEdit()}
        data-testid="cell-button"
        onClick={
          clickBehavior === 'none'
            ? null
            : e => {
                if (!disabled) {
                  onSelect && onSelect(e);
                  onEdit && onEdit();
                }
              }
        }
      >
        {children}
      </View>
    );
  },
);

type SelectCellProps = Omit<ComponentProps<typeof Cell>, 'children'> & {
  partial: boolean;
  onEdit?: () => void;
  onSelect?: (e) => void;
};
export function SelectCell({
  focused,
  selected,
  partial,
  style,
  onSelect,
  onEdit,
  ...props
}: SelectCellProps) {
  return (
    <Cell
      {...props}
      focused={focused}
      name="select"
      width={20}
      style={[{ alignItems: 'center', userSelect: 'none' }, style]}
      onClick={e => {
        e.stopPropagation();
        onSelect && onSelect(e);
        onEdit && onEdit();
      }}
    >
      {() => (
        <CellButton
          style={[
            {
              width: 12,
              height: 12,
              border: '1px solid ' + colors.n8,
              borderRadius: 3,
              justifyContent: 'center',
              alignItems: 'center',

              ':focus': {
                border: '1px solid ' + colors.b5,
                boxShadow: '0 1px 2px ' + colors.b5,
              },
            },
            selected && {
              backgroundColor: partial ? colors.b9 : colors.b5,
              borderColor: partial ? colors.b9 : colors.b5,
            },
          ]}
          onEdit={onEdit}
          onSelect={onSelect}
          clickBehavior="none"
        >
          {selected && (
            <Checkmark width={6} height={6} style={{ color: 'white' }} />
          )}
        </CellButton>
      )}
    </Cell>
  );
}

type SheetCellValueProps = {
  binding: ComponentProps<typeof SheetValue>['binding'];
  type: string;
  getValueStyle?: (value: unknown) => CSSProperties;
  formatExpr?: (value) => string;
  unformatExpr?: (value: string) => unknown;
};

type SheetCellProps = ComponentProps<typeof Cell> & {
  valueProps: SheetCellValueProps;
  inputProps?: Omit<ComponentProps<typeof InputValue>, 'value' | 'onUpdate'>;
  onSave?: (value) => void;
};
export function SheetCell({
  valueProps,
  valueStyle,
  inputProps,
  textAlign,
  onSave,
  ...props
}: SheetCellProps) {
  const { binding, type, getValueStyle, formatExpr, unformatExpr } = valueProps;

  return (
    <SheetValue
      binding={binding}
      onChange={e => {
        // "close" the cell if it's editing
        if (props.exposed && inputProps && inputProps.onBlur) {
          inputProps.onBlur(e);
        }
      }}
    >
      {node => {
        return (
          <Cell
            valueStyle={
              getValueStyle
                ? [valueStyle, getValueStyle(node.value)]
                : valueStyle
            }
            textAlign={textAlign}
            {...props}
            value={node.value}
            formatter={value =>
              props.formatter
                ? props.formatter(value, type)
                : format(value, type)
            }
            data-cellname={node.name}
          >
            {() => {
              return (
                <InputValue
                  value={formatExpr ? formatExpr(node.value) : node.value}
                  onUpdate={value => {
                    onSave(unformatExpr ? unformatExpr(value) : value);
                  }}
                  style={{ textAlign }}
                  {...inputProps}
                />
              );
            }}
          </Cell>
        );
      }}
    </SheetValue>
  );
}

type TableHeaderProps = ComponentProps<typeof Row> & {
  headers?: Array<ComponentProps<typeof Cell>>;
  version?: string;
};
export function TableHeader({
  headers,
  children,
  version,
  ...rowProps
}: TableHeaderProps) {
  return (
    <View
      style={
        version === 'v2' && {
          borderRadius: '6px 6px 0 0',
          overflow: 'hidden',
          flexShrink: 0,
        }
      }
    >
      <Row
        backgroundColor="white"
        borderColor={colors.border}
        collapsed={true}
        {...rowProps}
        style={[
          { zIndex: 200 },
          version === 'v2'
            ? { color: colors.n4, fontWeight: 500 }
            : { color: colors.n4 },
          rowProps.style,
        ]}
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

export function SelectedItemsButton({ name, keyHandlers, items, onSelect }) {
  let selectedItems = useSelectedItems();
  let [menuOpen, setMenuOpen] = useState(null);

  if (selectedItems.size === 0) {
    return null;
  }

  return (
    <View>
      <KeyHandlers keys={keyHandlers || {}} />

      <Button
        bare
        style={{ color: colors.b3 }}
        onClick={() => setMenuOpen(true)}
      >
        <ExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
        {selectedItems.size} {name}
      </Button>

      {menuOpen && (
        <Tooltip
          position="bottom-right"
          width={200}
          style={{ padding: 0 }}
          onClose={() => setMenuOpen(false)}
        >
          <Menu
            onMenuSelect={name => {
              onSelect(name, [...selectedItems]);
              setMenuOpen(false);
            }}
            items={items}
          />
        </Tooltip>
      )}
    </View>
  );
}

let rowStyle = { position: 'absolute', willChange: 'transform', width: '100%' };

type TableHandleRef = {
  scrollTo: (id: number, alignment?: string) => void;
  scrollToTop: () => void;
  getScrolledItem: () => number;
  setRowAnimation: (flag) => void;
  edit(id: number, field, shouldScroll): void;
  anchor(): void;
  unanchor(): void;
  isAnchored(): boolean;
};

type TableWithNavigatorProps = TableProps & {
  fields;
};
export const TableWithNavigator = forwardRef<
  TableHandleRef,
  TableWithNavigatorProps
>(({ fields, ...props }, ref) => {
  let navigator = useTableNavigator(props.items, fields);
  return <Table {...props} navigator={navigator} />;
});

type TableItem = { id: number };

type TableProps = {
  items: TableItem[];
  count?: number;
  headers?: ReactNode | TableHeaderProps['headers'];
  contentHeader: ReactNode;
  loading: boolean;
  rowHeight?: number;
  backgroundColor?: string;
  renderItem: (arg: {
    item: TableItem;
    editing: boolean;
    focusedField: unknown;
    onEdit: (id, field) => void;
    index: number;
    position: number;
  }) => ReactNode;
  renderEmpty?: ReactNode | (() => ReactNode);
  getItemKey: (index: number) => TableItem['id'];
  loadMore?: () => void;
  style?: CSSProperties;
  navigator: ReturnType<typeof useTableNavigator>;
  listRef;
  onScroll: () => void;
  version?: string;
  animated?: boolean;
  allowPopupsEscape?: boolean;
  isSelected?: (id: TableItem['id']) => boolean;
};
export const Table = forwardRef<TableHandleRef, TableProps>(
  (
    {
      items,
      count,
      headers,
      contentHeader,
      loading,
      rowHeight = ROW_HEIGHT,
      backgroundColor = TABLE_BACKGROUND_COLOR,
      renderItem,
      renderEmpty,
      getItemKey,
      loadMore,
      style,
      navigator,
      listRef,
      onScroll,
      version = 'v1',
      animated,
      allowPopupsEscape,
      isSelected,
      ...props
    },
    ref,
  ) => {
    if (!navigator) {
      navigator = {
        onEdit: () => {},
        editingId: null,
        focusedField: null,
        getNavigatorProps: props => props,
      };
    }

    let { onEdit, editingId, focusedField, getNavigatorProps } = navigator;
    let list = useRef(null);
    let listContainer = useRef(null);
    let scrollContainer = useRef(null);
    let initialScrollTo = useRef(null);
    let listInitialized = useRef(false);

    useImperativeHandle(ref, () => ({
      scrollTo: (id, alignment = 'smart') => {
        let index = items.findIndex(item => item.id === id);
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
        list.current && list.current.scrollTo(0);
      },

      getScrolledItem: () => {
        if (scrollContainer.current) {
          let offset = scrollContainer.current.scrollTop;
          let index = list.current.getStartIndexForOffset(offset);
          return items[index].id;
        }
        return 0;
      },

      setRowAnimation: flag => {
        list.current && list.current.setRowAnimation(flag);
      },

      edit(id, field, shouldScroll) {
        onEdit(id, field);

        if (id && shouldScroll) {
          // @ts-expect-error this should not be possible
          ref.scrollTo(id);
        }
      },

      anchor() {
        list.current && list.current.anchor();
      },

      unanchor() {
        list.current && list.current.unanchor();
      },

      isAnchored() {
        return list.current && list.current.isAnchored();
      },
    }));

    useLayoutEffect(() => {
      // We wait for the list to mount because AutoSizer needs to run
      // before it's mounted
      if (!listInitialized.current && listContainer.current) {
        // Animation is on by default
        list.current && list.current.setRowAnimation(true);
        listInitialized.current = true;
      }
    });

    function renderRow({ index, style, key }) {
      let item = items[index];
      let editing = editingId === item.id;
      let selected = isSelected && isSelected(item.id);

      let row = renderItem({
        item,
        editing,
        focusedField: editing && focusedField,
        onEdit,
        index,
        position: style.top,
      });

      // TODO: Need to also apply zIndex if item is selected
      // * Port over ListAnimation to Table
      // * Move highlighted functionality into here
      return (
        <View
          key={key}
          className="animated-row"
          style={[
            rowStyle,
            {
              zIndex: editing || selected ? 101 : 'auto',
              transform: 'translateY(var(--pos))',
            },
          ]}
          // @ts-expect-error not a recognised style attribute
          nativeStyle={{ '--pos': `${style.top - 1}px` }}
          data-focus-key={item.id}
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

    function onItemsRendered({ overscanStartIndex, overscanStopIndex }) {
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
            color: colors.n6,
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
          style={[
            {
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor,
            },
          ]}
        >
          <AnimatedLoading width={25} color={colors.n1} />
        </View>
      );
    }

    let isEmpty = (count || items.length) === 0;

    return (
      <View
        style={[
          {
            flex: 1,
            outline: 'none',
            '& .animated .animated-row': { transition: '.25s transform' },
          },
          style,
        ]}
        tabIndex="1"
        {...getNavigatorProps(props)}
        data-testid="table"
      >
        {headers && (
          <TableHeader
            version={version}
            height={rowHeight}
            {...(Array.isArray(headers) ? { headers } : { children: headers })}
          />
        )}
        <View style={{ flex: 1, backgroundColor }}>
          {isEmpty ? (
            getEmptyContent(renderEmpty)
          ) : (
            <AutoSizer>
              {({ width, height }) => {
                if (width === 0 || height === 0) {
                  return null;
                }

                return (
                  <IntersectionBoundary.Provider
                    value={!allowPopupsEscape && listContainer}
                  >
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
                          getItemKey || ((index, data) => items[index].id)
                        }
                        indexForKey={key =>
                          items.findIndex(item => item.id === key)
                        }
                        initialScrollOffset={
                          initialScrollTo.current
                            ? getScrollOffset(height, initialScrollTo.current)
                            : 0
                        }
                        version={version}
                        animated={animated}
                        overscanCount={5}
                        onItemsRendered={onItemsRendered}
                        onScroll={onScroll}
                      />
                    </AvoidRefocusScrollProvider>
                  </IntersectionBoundary.Provider>
                );
              }}
            </AutoSizer>
          )}
        </View>
      </View>
    );
  },
);

export function useTableNavigator(data, fields) {
  let getFields = typeof fields !== 'function' ? () => fields : fields;
  let [editingId, setEditingId] = useState(null);
  let [focusedField, setFocusedField] = useState(null);
  let containerRef = useRef<HTMLDivElement>();

  // See `onBlur` for why we need this
  let store = useStore();
  let modalStackLength = useRef(0);

  // onEdit is passed to children, so make sure it maintains identity
  let onEdit = useCallback((id, field?) => {
    setEditingId(id);
    setFocusedField(id ? field : null);
  }, []);

  useEffect(() => {
    modalStackLength.current = store.getState().modals.modalStack.length;
  }, []);

  function flashInput() {
    // Force the container to be focused which suppresses the "space
    // pages down" behavior. If we don't do this and the user presses
    // up + space down quickly while nothing is focused, it would page
    // down.
    containerRef.current.focus();

    // Not ideal, but works for now. Let the UI show the input
    // go away, and then bring it back on the same row/field
    onEdit(null);

    setTimeout(() => {
      onEdit(editingId, focusedField);
    }, 100);
  }

  function onFocusPrevious() {
    let idx = data.findIndex(item => item.id === editingId);
    if (idx > 0) {
      let item = data[idx - 1];
      let fields = getFields(item);
      onEdit(item.id, fields[fields.length - 1]);
    } else {
      flashInput();
    }
  }

  function onFocusNext() {
    let idx = data.findIndex(item => item.id === editingId);
    if (idx < data.length - 1) {
      let item = data[idx + 1];
      let fields = getFields(item);
      onEdit(item.id, fields[0]);
    } else {
      flashInput();
    }
  }

  function moveHorizontally(dir) {
    if (editingId) {
      let fields = getFields(data.find(item => item.id === editingId));
      let idx = fields.indexOf(focusedField) + dir;

      if (idx < 0) {
        onFocusPrevious();
      } else if (idx >= fields.length) {
        onFocusNext();
      } else {
        setFocusedField(fields[idx]);
      }
    }
  }

  function moveVertically(dir) {
    if (editingId) {
      let idx = data.findIndex(item => item.id === editingId);
      let nextIdx = idx;

      while (true) {
        nextIdx = nextIdx + dir;
        if (nextIdx >= 0 && nextIdx < data.length) {
          const next = data[nextIdx];
          if (getFields(next).includes(focusedField)) {
            onEdit(next.id, focusedField);
            break;
          }
        } else {
          flashInput();
          break;
        }
      }
    }
  }

  function onMove(dir) {
    switch (dir) {
      case 'left':
        moveHorizontally(-1);
        break;
      case 'right':
        moveHorizontally(1);
        break;
      case 'up':
        moveVertically(-1);
        break;
      case 'down':
        moveVertically(1);
        break;
      default:
        throw new Error('Unknown direction: ' + dir);
    }
  }

  function getNavigatorProps(userProps) {
    return {
      ...userProps,

      innerRef: containerRef,

      onKeyDown: e => {
        userProps && userProps.onKeyDown && userProps.onKeyDown(e);
        if (e.isPropagationStopped()) {
          return;
        }

        switch (e.key) {
          case 'ArrowUp':
          case 'k':
            if (e.target.tagName !== 'INPUT') {
              onMove('up');
            }
            break;

          case 'ArrowDown':
          case 'j':
            if (e.target.tagName !== 'INPUT') {
              onMove('down');
            }
            break;

          case 'Enter':
          case 'Tab':
            e.preventDefault();
            e.stopPropagation();

            onMove(
              e.key === 'Enter'
                ? e.shiftKey
                  ? 'up'
                  : 'down'
                : e.shiftKey
                ? 'left'
                : 'right',
            );
            break;
          default:
        }
      },

      onBlur: e => {
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
        let prevNumModals = modalStackLength.current;
        let numModals = store.getState().modals.modalStack.length;

        if (
          document.hasFocus() &&
          (e.relatedTarget == null ||
            !containerRef.current.contains(e.relatedTarget) ||
            containerRef.current === e.relatedTarget) &&
          prevNumModals === numModals
        ) {
          onEdit(null);
        }
      },
    };
  }

  return { onEdit, editingId, focusedField, getNavigatorProps };
}
