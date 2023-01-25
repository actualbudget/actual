import React, { useState, useRef, useEffect } from 'react';

import lively from '@jlongster/lively';
import Downshift from 'downshift';
import { css } from 'glamor';

import { colors } from '../style';
import Remove from '../svg/v2/Remove';

import { View, Input, Tooltip, Button } from './common';

function findItem(strict, suggestions, value) {
  if (strict) {
    let idx = suggestions.findIndex(item => item.id === value);
    return idx === -1 ? null : suggestions[idx];
  }

  return value;
}

function getItemName(item) {
  if (item == null) {
    return '';
  } else if (typeof item === 'string') {
    return item;
  }
  return item.name || '';
}

function getItemId(item) {
  if (typeof item === 'string') {
    return item;
  }
  return item ? item.id : null;
}

function getInitialState({
  props: {
    value,
    suggestions,
    embedded,
    isOpen = false,
    strict,
    initialFilterSuggestions
  }
}) {
  let selectedItem = findItem(strict, suggestions, value);
  let filteredSuggestions = initialFilterSuggestions
    ? initialFilterSuggestions(suggestions, value)
    : null;

  return {
    selectedItem,
    value: selectedItem ? getItemName(selectedItem) : '',
    originalItem: selectedItem,
    filteredSuggestions,
    highlightedIndex: null,
    isOpen: embedded || isOpen
  };
}

function componentWillReceiveProps(bag, nextProps) {
  let {
    strict,
    suggestions,
    filterSuggestions = defaultFilterSuggestions,
    initialFilterSuggestions,
    value,
    itemToString = defaultItemToString
  } = nextProps;
  let { value: currValue } = bag.state;
  let updates = null;

  function updateValue() {
    let selectedItem = findItem(strict, suggestions, value);
    if (selectedItem) {
      updates = updates || {};
      updates.value = itemToString(selectedItem);
      updates.selectedItem = selectedItem;
    }
  }

  if (bag.props.value !== value) {
    updateValue();
  }

  // TODO: Something is causing a rerender immediately after first
  // render, and this condition is true, causing items to be filtered
  // twice. This shouldn't effect functionality (I think), but look
  // into this later
  if (bag.props.suggestions !== suggestions) {
    let filteredSuggestions = null;

    if (bag.state.highlightedIndex != null) {
      filteredSuggestions = filterSuggestions(suggestions, currValue);
    } else {
      filteredSuggestions = initialFilterSuggestions
        ? initialFilterSuggestions(suggestions, currValue)
        : null;
    }

    updates = updates || {};
    updateValue();
    updates.filteredSuggestions = filteredSuggestions;
  }

  return updates;
}

export function defaultFilterSuggestion(suggestion, value) {
  return getItemName(suggestion).toLowerCase().includes(value.toLowerCase());
}

export function defaultFilterSuggestions(suggestions, value) {
  return suggestions.filter(suggestion =>
    defaultFilterSuggestion(suggestion, value)
  );
}

function fireUpdate(onUpdate, strict, suggestions, index, value) {
  // If the index is null, look up the id in the suggestions. If the
  // value is empty it will select nothing (as expected). If it's not
  // empty but nothing is selected, it still resolves to an id. It
  // would very confusing otherwise: the menu could be in a state
  // where nothing is highlighted but there is a valid value.

  let selected = null;
  if (!strict) {
    selected = value;
  } else {
    if (index == null) {
      // If passing in a value directly, validate the id
      let sug = suggestions.find(sug => sug.id === value);
      if (sug) {
        selected = sug.id;
      }
    } else if (index < suggestions.length) {
      selected = suggestions[index].id;
    }
  }

  onUpdate && onUpdate(selected);
}

function onInputValueChange(
  {
    props: {
      suggestions,
      onUpdate,
      multi,
      highlightFirst,
      strict,
      filterSuggestions = defaultFilterSuggestions,
      getHighlightedIndex
    },
    state: { isOpen }
  },
  value,
  changes
) {
  // OMG this is the dumbest thing ever. I need to remove Downshift
  // and build my own component. For some reason this is fired on blur
  // with an empty value which clears out the input when the app blurs
  if (!document.hasFocus()) {
    return;
  }

  // Do nothing if it's simply updating the selected item
  if (
    changes.type ===
    Downshift.stateChangeTypes.controlledPropUpdatedSelectedItem
  ) {
    return;
  }

  // Otherwise, filter the items and always the first item if
  // desired
  const filteredSuggestions = filterSuggestions(suggestions, value);

  if (value === '') {
    // A blank value shouldn't highlight any item so that the field
    // can be left blank if desired

    if (changes.type !== Downshift.stateChangeTypes.clickItem) {
      fireUpdate(onUpdate, strict, filteredSuggestions, null, null);
    }

    return {
      value,
      filteredSuggestions,
      highlightedIndex: null
    };
  } else {
    let defaultGetHighlightedIndex = filteredSuggestions => {
      return highlightFirst && filteredSuggestions.length ? 0 : null;
    };
    let highlightedIndex = (getHighlightedIndex || defaultGetHighlightedIndex)(
      filteredSuggestions
    );

    if (changes.type !== Downshift.stateChangeTypes.clickItem) {
      fireUpdate(
        onUpdate,
        strict,
        filteredSuggestions,
        highlightedIndex,
        value
      );
    }

    return {
      value,
      filteredSuggestions,
      highlightedIndex
    };
  }
}

function onStateChange({ props, state, inst }, changes, stateAndHelpers) {
  if (
    props.tableBehavior &&
    changes.type === Downshift.stateChangeTypes.mouseUp
  ) {
    return;
  }

  const newState = {};
  if ('highlightedIndex' in changes) {
    newState.highlightedIndex = changes.highlightedIndex;
  }
  if ('isOpen' in changes) {
    newState.isOpen = props.embedded ? true : changes.isOpen;
  }
  if ('selectedItem' in changes) {
    newState.selectedItem = changes.selectedItem;
  }

  // We only ever want to update the value if the user explicitly
  // highlighted an item via the keyboard. It shouldn't change with
  // mouseover; otherwise the user could accidentally hover over an
  // item without realizing it and change the value.
  if (
    state.isOpen &&
    (changes.type === Downshift.stateChangeTypes.keyDownArrowUp ||
      changes.type === Downshift.stateChangeTypes.keyDownArrowDown)
  ) {
    fireUpdate(
      props.onUpdate,
      props.strict,
      state.filteredSuggestions || props.suggestions,
      newState.highlightedIndex != null
        ? newState.highlightedIndex
        : state.highlightedIndex,
      state.value
    );
  }

  inst.lastChangeType = changes.type;
  return newState;
}

function onSelect(
  { props: { onSelect, clearAfterSelect, suggestions }, inst },
  item
) {
  if (onSelect) {
    // I AM NOT PROUD OF THIS OK??
    // This WHOLE FILE is a mess anyway
    // OK SIT DOWN AND I WILL EXPLAIN
    // This component uses `componentWillReceiveProps` and in there
    // it will re-filter suggestions if the suggestions change and
    // a `highlightedIndex` exists. When we select something,
    // we clear `highlightedIndex` so it should show all suggestions
    // again. HOWEVER, in the case of a multi-autocomplete, it's
    // changing the suggestions every time something is selected.
    // In that case, cWRP is running *before* our state setting that
    // cleared `highlightedIndex`. Forcing this to run later assures
    // us that we will clear out local state before cWRP runs.
    // YEAH THAT'S ALL OK I JUST WANT TO SHIP THIS
    setTimeout(() => {
      onSelect(getItemId(item));
    }, 0);
  }
  return onSelectAfter(suggestions, clearAfterSelect, inst);
}

function onSelectAfter(suggestions, clearAfterSelect, inst) {
  if (clearAfterSelect) {
    return {
      value: '',
      selectedItem: null,
      highlightedIndex: null,
      filteredSuggestions: suggestions
    };
  } else if (inst.input) {
    inst.input.setSelectionRange(0, 10000);
  }
}

function onChange({ props: { inputProps } }, e) {
  const { onChange } = inputProps || {};
  onChange && onChange(e.target.value);
}

function onKeyDown(
  {
    props: {
      suggestions,
      clearAfterSelect,
      initialFilterSuggestions,
      embedded,
      onUpdate,
      onSelect,
      inputProps,
      shouldSaveFromKey = defaultShouldSaveFromKey,
      strict
    },
    state: {
      selectedItem,
      filteredSuggestions,
      highlightedIndex,
      originalItem,
      isNulled,
      isOpen,
      value
    },
    inst
  },
  e
) {
  let ENTER = 13;
  let ESC = 27;
  let { onKeyDown } = inputProps || {};

  // If the dropdown is open, an item is highlighted, and the user
  // pressed enter, always capture that and handle it ourselves
  if (isOpen) {
    if (e.keyCode === ENTER) {
      if (highlightedIndex != null) {
        if (inst.lastChangeType === Downshift.stateChangeTypes.itemMouseEnter) {
          // If the last thing the user did was hover an item, intentionally
          // ignore the default behavior of selecting the item. It's too
          // common to accidentally hover an item and then save it
          e.preventDefault();
        } else {
          // Otherwise, stop propagation so that the table navigator
          // doesn't handle it
          e.stopPropagation();
        }
      } else if (!strict) {
        // Handle it ourselves
        e.stopPropagation();
        onSelect(value);
        return onSelectAfter(suggestions, clearAfterSelect, inst);
      } else {
        // No highlighted item, still allow the table to save the item
        // as `null`, even though we're allowing the table to move
        e.preventDefault();
        onKeyDown && onKeyDown(e);
      }
    } else if (shouldSaveFromKey(e)) {
      e.preventDefault();
      onKeyDown && onKeyDown(e);
    }
  }

  // Handle escape ourselves
  if (e.keyCode === ESC) {
    e.preventDefault();

    if (!embedded) {
      e.stopPropagation();
    }

    let filteredSuggestions = initialFilterSuggestions
      ? initialFilterSuggestions(suggestions, getItemName(originalItem))
      : null;
    fireUpdate(onUpdate, strict, suggestions, null, getItemId(originalItem));
    return {
      value: getItemName(originalItem),
      selectedItem: findItem(strict, suggestions, originalItem),
      filteredSuggestions,
      highlightedIndex: null,
      isOpen: embedded ? true : false
    };
  }
}

function defaultRenderInput(props) {
  return <Input {...props} />;
}

function defaultRenderItems(items, getItemProps, highlightedIndex) {
  return (
    <div>
      {items.map((item, index) => {
        let name = getItemName(item);
        return (
          <div
            {...getItemProps({ item })}
            key={name}
            {...css({
              padding: 5,
              cursor: 'default',
              backgroundColor: highlightedIndex === index ? colors.n4 : null
            })}
          >
            {name}
          </div>
        );
      })}
    </div>
  );
}

function defaultShouldSaveFromKey(e) {
  // Enter
  return e.keyCode === 13;
}

function onFocus({ inst, props: { inputProps = {}, openOnFocus = true } }, e) {
  inputProps.onFocus && inputProps.onFocus(e);

  if (openOnFocus) {
    return { isOpen: true };
  }
}

function onBlur({ inst, props, state: { selectedItem } }, e) {
  let { inputProps = {}, onSelect } = props;

  e.preventDownshiftDefault = true;
  inputProps.onBlur && inputProps.onBlur(e);

  if (!props.tableBehavior) {
    if (e.target.value === '') {
      onSelect && onSelect(null);
      return { selectedItem: null, originalValue: null, isOpen: false };
    }

    // If not using table behavior, reset the input on blur. Tables
    // handle saving the value on blur.
    let value = selectedItem ? getItemId(selectedItem) : null;

    return getInitialState({
      props: {
        ...props,
        value,
        originalValue: value
      }
    });
  } else {
    return { isOpen: false };
  }
}

function defaultItemToString(item) {
  return item ? getItemName(item) : '';
}

function _SingleAutocomplete({
  props: {
    focused,
    embedded,
    containerProps,
    inputProps,
    children,
    suggestions,
    tooltipStyle,
    onItemClick,
    strict,
    tooltipProps,
    renderInput = defaultRenderInput,
    renderItems = defaultRenderItems,
    itemToString = defaultItemToString
  },
  state: { value, selectedItem, filteredSuggestions, highlightedIndex, isOpen },
  updater,
  inst
}) {
  const filtered = filteredSuggestions || suggestions;

  return (
    <Downshift
      onSelect={updater(onSelect)}
      highlightedIndex={highlightedIndex}
      selectedItem={selectedItem || null}
      itemToString={itemToString}
      inputValue={value}
      isOpen={isOpen}
      onInputValueChange={updater(onInputValueChange)}
      onStateChange={updater(onStateChange)}
    >
      {({
        getInputProps,
        getItemProps,
        getRootProps,
        isOpen,
        inputValue,
        selectedItem,
        highlightedIndex
      }) => (
        // Super annoying but it works best to return a div so we
        // can't use a View here, but we can fake it be using the
        // className
        <div
          className={'view ' + css({ display: 'flex' }).toString()}
          {...containerProps}
        >
          {renderInput(
            getInputProps({
              focused,
              ...inputProps,
              onFocus: updater(onFocus),
              onBlur: updater(onBlur),
              onKeyDown: updater(onKeyDown),
              onChange: updater(onChange)
            })
          )}
          {isOpen &&
            filtered.length > 0 &&
            (embedded ? (
              <View style={{ marginTop: 5 }} data-testid="autocomplete">
                {renderItems(
                  filtered,
                  getItemProps,
                  highlightedIndex,
                  inputValue
                )}
              </View>
            ) : (
              <Tooltip
                position="bottom-stretch"
                offset={2}
                style={{
                  padding: 0,
                  backgroundColor: colors.n1,
                  color: 'white',
                  ...tooltipStyle
                }}
                {...tooltipProps}
                data-testid="autocomplete"
              >
                {renderItems(
                  filtered,
                  getItemProps,
                  highlightedIndex,
                  inputValue
                )}
              </Tooltip>
            ))}
        </div>
      )}
    </Downshift>
  );
}

const SingleAutocomplete = lively(_SingleAutocomplete, {
  getInitialState,
  componentWillReceiveProps
});

function MultiItem({ name, onRemove }) {
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: colors.b9,
        padding: '2px 4px',
        margin: '2px',
        borderRadius: 4
      }}
    >
      {name}
      <Button type="button" bare style={{ marginLeft: 1 }} onClick={onRemove}>
        <Remove style={{ width: 8, height: 8 }} />
      </Button>
    </View>
  );
}

export function MultiAutocomplete({
  value: selectedItems,
  onSelect,
  suggestions,
  strict,
  ...props
}) {
  let [focused, setFocused] = useState(false);
  let lastSelectedItems = useRef();

  useEffect(() => {
    lastSelectedItems.current = selectedItems;
  });

  function onRemoveItem(id) {
    let items = selectedItems.filter(i => i !== id);
    onSelect(items);
  }

  function onAddItem(id) {
    if (id) {
      id = id.trim();
      onSelect([...selectedItems, id], id);
    }
  }

  function onKeyDown(e, prevOnKeyDown) {
    if (e.key === 'Backspace' && e.target.value === '') {
      onRemoveItem(selectedItems[selectedItems.length - 1]);
    }

    prevOnKeyDown && prevOnKeyDown(e);
  }

  return (
    <Autocomplete
      {...props}
      value={null}
      suggestions={suggestions.filter(
        item => !selectedItems.includes(getItemId(item))
      )}
      onSelect={onAddItem}
      clearAfterSelect
      highlightFirst
      strict={strict}
      tooltipProps={{
        forceLayout: lastSelectedItems.current !== selectedItems
      }}
      renderInput={props => (
        <View
          style={[
            {
              display: 'flex',
              flexWrap: 'wrap',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'white',
              borderRadius: 4,
              border: '1px solid #d0d0d0'
            },
            focused && {
              border: '1px solid ' + colors.b5,
              boxShadow: '0 1px 1px ' + colors.b7
            }
          ]}
        >
          {selectedItems.map((item, idx) => {
            item = findItem(strict, suggestions, item);
            return (
              item && (
                <MultiItem
                  key={getItemId(item) || idx}
                  name={getItemName(item)}
                  onRemove={() => onRemoveItem(getItemId(item))}
                />
              )
            );
          })}
          <Input
            {...props}
            onKeyDown={e => onKeyDown(e, props.onKeyDown)}
            onFocus={e => {
              setFocused(true);
              props.onFocus(e);
            }}
            onBlur={e => {
              setFocused(false);
              props.onBlur(e);
            }}
            style={[
              {
                flex: 1,
                minWidth: 30,
                border: 0,
                ':focus': { border: 0, boxShadow: 'none' }
              },
              props.style
            ]}
          />
        </View>
      )}
    />
  );
}

export function AutocompleteFooterButton({
  title,
  style,
  hoveredStyle,
  onClick
}) {
  return (
    <Button
      style={[
        {
          fontSize: 12,
          color: colors.n10,
          backgroundColor: 'transparent',
          borderColor: colors.n5
        },
        style
      ]}
      hoveredStyle={[
        { backgroundColor: 'rgba(200, 200, 200, .25)' },
        hoveredStyle
      ]}
      onClick={onClick}
    >
      {title}
    </Button>
  );
}

export function AutocompleteFooter({ show = true, embedded, children }) {
  return (
    show && (
      <View
        style={[
          { flexShrink: 0 },
          embedded ? { paddingTop: 5 } : { padding: 5 }
        ]}
        onMouseDown={e => e.preventDefault()}
      >
        {children}
      </View>
    )
  );
}

export default function Autocomplete({ multi, ...props }) {
  if (multi) {
    return <MultiAutocomplete {...props} />;
  } else {
    return <SingleAutocomplete {...props} />;
  }
}
