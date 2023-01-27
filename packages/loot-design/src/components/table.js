import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useContext,
  useMemo
} from 'react';
import { useStore } from 'react-redux';
import AutoSizer from 'react-virtualized-auto-sizer';

import { scope } from '@jlongster/lively';

import { styles, colors } from '../style';
import AnimatedLoading from '../svg/AnimatedLoading';
import DeleteIcon from '../svg/v0/Delete';
import ExpandArrow from '../svg/v0/ExpandArrow';
import Checkmark from '../svg/v1/Checkmark';
import { keys } from '../util/keys';

import {
  View,
  Text,
  Button,
  Input,
  Tooltip,
  IntersectionBoundary,
  Menu
} from './common';
import DateSelect from './DateSelect';
import { FixedSizeList } from './FixedSizeList';
import { KeyHandlers } from './KeyHandlers';
import format from './spreadsheet/format';
import SheetValue from './spreadsheet/SheetValue';
import { AvoidRefocusScrollProvider, useProperFocus } from './useProperFocus';
import { useSelectedItems } from './useSelected';

export const ROW_HEIGHT = 32;
export const TABLE_BACKGROUND_COLOR = colors.n11;

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

const CellContext = React.createContext({
  backgroundColor: 'white',
  borderColor: colors.n9
});

function CellProvider({ backgroundColor, borderColor, children }) {
  let value = useMemo(
    () => ({
      backgroundColor,
      borderColor
    }),
    [backgroundColor, borderColor]
  );

  return <CellContext.Provider value={value}>{children}</CellContext.Provider>;
}

export const Field = React.forwardRef(function Field(
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
  ref
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
          backgroundColor
        },
        styles.smallText,
        style
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
            justifyContent: 'center'
          },
          contentStyle
        ]}
      >
        {truncate ? (
          <Text
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
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
  ...viewProps
}) {
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
    backgroundColor
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
        children()
      ) : (
        <View
          style={[
            {
              flex: 1,
              padding: '0 5px',
              justifyContent: 'center'
            },
            styles.smallText,
            valueStyle
          ]}
          // Can't use click because we only want to expose the cell if
          // the user does a direct click, not if they also drag the
          // mouse to select something
          onMouseDown={e => (mouseCoords.current = [e.clientX, e.clientY])}
          onMouseUp={e => {
            if (
              mouseCoords.current &&
              Math.abs(e.clientX - mouseCoords.current[0]) < 5 &&
              Math.abs(e.clientY - mouseCoords.current[1]) < 5
            ) {
              onExpose && onExpose(name);
            }
          }}
          // When testing, allow the click handler to be used instead
          onClick={global.IS_TESTING && (() => onExpose && onExpose(name))}
        >
          <Text
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {formatter ? formatter(value) : value}
          </Text>
        </View>
      )}
    </View>
  );
}

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
}) {
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
              transition: '.7s background-color'
            }
          },
          collapsed && { marginTop: -1 },
          style
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
  margin: '0 1px'
};

const readonlyInputStyle = {
  backgroundColor: 'transparent',
  '::selection': { backgroundColor: '#d9d9d9' }
};

function InputValue({ value: defaultValue, onUpdate, onBlur, ...props }) {
  let [value, setValue] = useState(defaultValue);

  function onBlur_(e) {
    onUpdate && onUpdate(value);
    onBlur && fireBlur(onBlur, e);
  }

  function onKeyDown(e) {
    // Only enter and tab to escape (which allows the user to move
    // around)
    if (e.keyCode !== keys.ENTER && e.keyCode !== keys.TAB) {
      e.stopPropagation();
    }

    if (e.keyCode === keys.ESC) {
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
        props.style
      ]}
    />
  );
}

export function InputCell({
  inputProps,
  onUpdate,
  onBlur,
  textAlign,
  error,
  ...props
}) {
  return (
    <Cell textAlign={textAlign} {...props}>
      {() => (
        <React.Fragment>
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
        </React.Fragment>
      )}
    </Cell>
  );
}

export function shouldSaveFromKey(e) {
  switch (e.keyCode) {
    case keys.TAB:
    case keys.ENTER:
      e.preventDefault();
      return true;
    default:
  }
}

export function CustomCell({
  value: defaultValue,
  children,
  onUpdate,
  onBlur,
  ...props
}) {
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
          inputStyle: inputCellStyle
        })
      }
    </Cell>
  );
}

export const DateSelectCell = scope(lively => {
  function DateSelectCell({ props: { dateSelectProps, ...props }, updater }) {
    const { inputProps = {} } = dateSelectProps;
    return (
      <Cell
        {...props}
        style={{
          zIndex: props.exposed ? 1 : 0,
          ...props.style
        }}
      >
        {() => (
          <DateSelect
            {...dateSelectProps}
            tooltipStyle={{ minWidth: 225 }}
            inputProps={{
              ...inputProps,
              onBlur: e => fireBlur(inputProps && inputProps.onBlur, e),
              style: [inputCellStyle, { zIndex: 300 }]
            }}
          />
        )}
      </Cell>
    );
  }

  return lively(DateSelectCell);
});

export function DeleteCell({ onDelete, style, ...props }) {
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

export const CellButton = React.forwardRef(
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
        tabIndex="0"
        onKeyDown={e => {
          if (e.keyCode === keys.X || e.keyCode === keys.SPACE) {
            e.preventDefault();
            if (!disabled) {
              onSelect && onSelect();
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
              boxShadow: `0 0 0 3px white, 0 0 0 5px ${colors.b5}`
            }
          },
          style
        ]}
        onFocus={() => onEdit && onEdit()}
        data-testid="cell-button"
        onClick={
          clickBehavior === 'none'
            ? null
            : () => {
                if (!disabled) {
                  onSelect && onSelect();
                  onEdit && onEdit();
                }
              }
        }
      >
        {children}
      </View>
    );
  }
);

export function SelectCell({
  focused,
  selected,
  partial,
  style,
  onSelect,
  onEdit,
  ...props
}) {
  return (
    <Cell
      {...props}
      focused={focused}
      name="select"
      width={20}
      style={[{ alignItems: 'center', userSelect: 'none' }, style]}
      onClick={e => {
        e.stopPropagation();
        onSelect && onSelect();
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
                boxShadow: '0 1px 2px ' + colors.b5
              }
            },
            selected && {
              backgroundColor: partial ? colors.b9 : colors.b5,
              borderColor: partial ? colors.b9 : colors.b5
            }
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

export function SheetCell({
  valueProps,
  valueStyle,
  inputProps,
  sync,
  textAlign,
  onSave,
  ...props
}) {
  const { binding, type, getValueStyle, formatExpr, unformatExpr } = valueProps;

  return (
    <SheetValue
      binding={binding}
      onChange={() => {
        // "close" the cell if it's editing
        if (props.exposed && inputProps && inputProps.onBlur) {
          inputProps.onBlur();
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

export const Highlight = scope(lively => {
  function Highlight({ inst, state: { activated, highlightOff } }) {
    return (
      <View
        innerRef={el => (inst.el = el)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transition: 'background-color 1.8s',
          backgroundColor: 'white'
        }}
      />
    );
  }

  function activate({ inst }) {
    inst.el.style.transitionDuration = '0s';
    inst.el.style.backgroundColor = colors.y9;
    setTimeout(() => {
      if (inst.el) {
        inst.el.style.transitionDuration = '1.8s';
        inst.el.style.backgroundColor = 'white';
      }
    }, 0);
  }

  return lively(Highlight, {
    getInitialState({ props }) {
      return { activated: false, highlightOff: true };
    },

    componentWillReceiveProps(bag, nextProps) {
      if (!bag.props.active && nextProps.active) {
        return activate(bag);
      }
    },

    componentDidMount(bag) {
      if (bag.props.active) {
        return activate(bag);
      }
    }
  });
});

export function TableHeader({ headers, children, version, ...rowProps }) {
  return (
    <View
      style={
        version === 'v2' && {
          borderRadius: '6px 6px 0 0',
          overflow: 'hidden',
          flexShrink: 0
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
          rowProps.style
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

export const TableWithNavigator = React.forwardRef(
  ({ fields, ...props }, ref) => {
    let navigator = useTableNavigator(props.items, fields);
    return <Table {...props} navigator={navigator} />;
  }
);

export const Table = React.forwardRef(
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
    ref
  ) => {
    if (!navigator) {
      navigator = {
        onEdit: () => {},
        editingId: null,
        focusedField: null,
        getNavigatorProps: props => props
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
      }
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
        position: style.top
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
              transform: 'translateY(var(--pos))'
            }
          ]}
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
            flex: 1
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
              backgroundColor
            }
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
            '& .animated .animated-row': { transition: '.25s transform' }
          },
          style
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
  }
);

export function useTableNavigator(data, fields, opts = {}) {
  let getFields = typeof fields !== 'function' ? () => fields : fields;
  let { initialEditingId, initialFocusedField, moveKeys } = opts;
  let [editingId, setEditingId] = useState(initialEditingId || null);
  let [focusedField, setFocusedField] = useState(initialFocusedField || null);
  let containerRef = useRef();

  // See `onBlur` for why we need this
  let store = useStore();
  let modalStackLength = useRef(0);

  // onEdit is passed to children, so make sure it maintains identity
  let onEdit = useCallback((id, field) => {
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

        let fieldKeys =
          moveKeys && moveKeys[focusedField] && moveKeys[focusedField];

        if (fieldKeys && fieldKeys[e.keyCode]) {
          e.preventDefault();
          e.stopPropagation();

          onMove(fieldKeys[e.keyCode]);
        } else {
          switch (e.keyCode) {
            case keys.UP:
            case keys.K:
              if (e.target.tagName !== 'INPUT') {
                onMove('up');
              }
              break;

            case keys.DOWN:
            case keys.J:
              if (e.target.tagName !== 'INPUT') {
                onMove('down');
              }
              break;

            case keys.ENTER:
            case keys.TAB:
              e.preventDefault();
              e.stopPropagation();

              onMove(
                e.keyCode === keys.ENTER
                  ? e.shiftKey
                    ? 'up'
                    : 'down'
                  : e.shiftKey
                  ? 'left'
                  : 'right'
              );
              break;
            default:
          }
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
            !containerRef.current.contains(e.relatedTarget)) &&
          prevNumModals === numModals
        ) {
          onEdit(null);
        }
      }
    };
  }

  return { onEdit, editingId, focusedField, getNavigatorProps };
}
