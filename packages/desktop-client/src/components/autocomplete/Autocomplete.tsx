import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  type ComponentProps,
  type HTMLProps,
  type ReactNode,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';

import Downshift from 'downshift';
import { type CSSProperties, css } from 'glamor';

import Remove from '../../icons/v2/Remove';
import { colors } from '../../style';
import { View, Input, Tooltip, Button } from '../common';

const inst: { lastChangeType? } = {};

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

export function defaultFilterSuggestion(suggestion, value) {
  return getItemName(suggestion).toLowerCase().includes(value.toLowerCase());
}

function defaultFilterSuggestions(suggestions, value) {
  return suggestions.filter(suggestion =>
    defaultFilterSuggestion(suggestion, value),
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

  onUpdate && onUpdate(selected, value);
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
              backgroundColor: highlightedIndex === index ? colors.n4 : null,
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
  return e.code === 'Enter';
}

function defaultItemToString(item) {
  return item ? getItemName(item) : '';
}

type SingleAutocompleteProps = {
  focused?: boolean;
  embedded?: boolean;
  containerProps?: HTMLProps<HTMLDivElement>;
  labelProps?: { id?: string };
  inputProps?: ComponentProps<typeof Input>;
  suggestions?: unknown[];
  tooltipStyle?: CSSProperties;
  tooltipProps?: ComponentProps<typeof Tooltip>;
  renderInput?: (props: ComponentProps<typeof Input>) => ReactNode;
  renderItems?: (
    items,
    getItemProps: (arg: { item: unknown }) => HTMLProps<HTMLDivElement>,
    idx: number,
    value?: unknown,
  ) => ReactNode;
  itemToString?: (item: unknown) => string;
  shouldSaveFromKey?: (e: KeyboardEvent) => boolean;
  filterSuggestions?: (suggestions, value: string) => unknown[];
  openOnFocus?: boolean;
  getHighlightedIndex?: (suggestions) => number | null;
  highlightFirst?: boolean;
  onUpdate: (id: unknown, value: string) => void;
  strict?: boolean;
  onSelect: (id: unknown, value: string) => void;
  tableBehavior?: boolean;
  value: unknown[];
  isMulti?: boolean;
};
function SingleAutocomplete({
  focused,
  embedded = false,
  containerProps,
  labelProps = {},
  inputProps = {},
  suggestions,
  tooltipStyle,
  tooltipProps,
  renderInput = defaultRenderInput,
  renderItems = defaultRenderItems,
  itemToString = defaultItemToString,
  shouldSaveFromKey = defaultShouldSaveFromKey,
  filterSuggestions = defaultFilterSuggestions,
  openOnFocus = true,
  getHighlightedIndex,
  highlightFirst,
  onUpdate,
  strict,
  onSelect,
  tableBehavior,
  value: initialValue,
  isMulti = false,
}: SingleAutocompleteProps) {
  const [selectedItem, setSelectedItem] = useState(() =>
    findItem(strict, suggestions, initialValue),
  );
  const [value, setValue] = useState(
    selectedItem ? getItemName(selectedItem) : '',
  );
  const [isChanged, setIsChanged] = useState(false);
  const [originalItem, setOriginalItem] = useState(selectedItem);
  const filteredSuggestions = useMemo(
    () => filterSuggestions(suggestions, value),
    [filterSuggestions, suggestions, value],
  );
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(embedded);

  // Update the selected item if the suggestion list or initial
  // input value has changed
  useEffect(() => {
    setSelectedItem(findItem(strict, suggestions, initialValue));
  }, [initialValue, suggestions, strict]);

  function resetState(newValue) {
    const val = newValue === undefined ? initialValue : newValue;
    let selectedItem = findItem(strict, suggestions, val);

    setSelectedItem(selectedItem);
    setValue(selectedItem ? getItemName(selectedItem) : '');
    setOriginalItem(selectedItem);
    setHighlightedIndex(null);
    setIsOpen(embedded);
    setIsChanged(false);
  }

  function onSelectAfter() {
    setValue('');
    setSelectedItem(null);
    setHighlightedIndex(null);
    setIsChanged(false);
  }

  const filtered = isChanged ? filteredSuggestions || suggestions : suggestions;

  return (
    <Downshift
      onSelect={(item, { inputValue }) => {
        setSelectedItem(item);
        setHighlightedIndex(null);

        if (isMulti) {
          setValue('');
        } else {
          setIsOpen(false);
        }

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
            onSelect(getItemId(item), inputValue);
          }, 0);
        }
      }}
      highlightedIndex={highlightedIndex}
      selectedItem={selectedItem || null}
      itemToString={itemToString}
      inputValue={value}
      isOpen={isOpen}
      onInputValueChange={(value, changes) => {
        // OMG this is the dumbest thing ever. I need to remove Downshift
        // and build my own component. For some reason this is fired on blur
        // with an empty value which clears out the input when the app blurs
        if (!document.hasFocus()) {
          return;
        }

        if (
          [
            // Do nothing if it's simply updating the selected item
            Downshift.stateChangeTypes.controlledPropUpdatedSelectedItem,
            // Do nothing if it is a "touch" selection event
            Downshift.stateChangeTypes.touchEnd,
            // @ts-expect-error Types say there is no type
          ].includes(changes.type)
        ) {
          return;
        }

        // Otherwise, filter the items and always the first item if
        // desired
        const filteredSuggestions = filterSuggestions(suggestions, value);

        if (value === '') {
          // A blank value shouldn't highlight any item so that the field
          // can be left blank if desired
          // @ts-expect-error Types say there is no type
          if (changes.type !== Downshift.stateChangeTypes.clickItem) {
            fireUpdate(onUpdate, strict, filteredSuggestions, null, null);
          }

          setHighlightedIndex(null);
        } else {
          let defaultGetHighlightedIndex = filteredSuggestions => {
            return highlightFirst && filteredSuggestions.length ? 0 : null;
          };
          let highlightedIndex = (
            getHighlightedIndex || defaultGetHighlightedIndex
          )(filteredSuggestions);
          // @ts-expect-error Types say there is no type
          if (changes.type !== Downshift.stateChangeTypes.clickItem) {
            fireUpdate(
              onUpdate,
              strict,
              filteredSuggestions,
              highlightedIndex,
              value,
            );
          }

          setHighlightedIndex(highlightedIndex);
        }

        setValue(value);
        setIsChanged(true);
      }}
      onStateChange={changes => {
        if (
          tableBehavior &&
          changes.type === Downshift.stateChangeTypes.mouseUp
        ) {
          return;
        }

        if (
          'highlightedIndex' in changes &&
          changes.type !== Downshift.stateChangeTypes.changeInput
        ) {
          setHighlightedIndex(changes.highlightedIndex);
        }
        if ('selectedItem' in changes) {
          setSelectedItem(changes.selectedItem);
        }

        // We only ever want to update the value if the user explicitly
        // highlighted an item via the keyboard. It shouldn't change with
        // mouseover; otherwise the user could accidentally hover over an
        // item without realizing it and change the value.
        if (
          isOpen &&
          (changes.type === Downshift.stateChangeTypes.keyDownArrowUp ||
            changes.type === Downshift.stateChangeTypes.keyDownArrowDown)
        ) {
          fireUpdate(
            onUpdate,
            strict,
            filteredSuggestions || suggestions,
            changes.highlightedIndex != null
              ? changes.highlightedIndex
              : highlightedIndex,
            value,
          );
        }

        inst.lastChangeType = changes.type;
      }}
      labelId={labelProps?.id}
    >
      {({
        getInputProps,
        getItemProps,
        isOpen,
        inputValue,
        highlightedIndex,
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
              onFocus: e => {
                inputProps.onFocus && inputProps.onFocus(e);

                if (openOnFocus) {
                  setIsOpen(true);
                }
              },
              onBlur: e => {
                // @ts-expect-error Should this be e.nativeEvent
                e.preventDownshiftDefault = true;
                inputProps.onBlur && inputProps.onBlur(e);

                if (!tableBehavior) {
                  if (e.target.value === '') {
                    onSelect && onSelect(null, e.target.value);
                    setSelectedItem(null);
                    setIsOpen(false);
                    return;
                  }

                  // If not using table behavior, reset the input on blur. Tables
                  // handle saving the value on blur.
                  let value = selectedItem ? getItemId(selectedItem) : null;

                  resetState(value);
                } else {
                  setIsOpen(false);
                }
              },
              onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
                let { onKeyDown } = inputProps || {};

                // If the dropdown is open, an item is highlighted, and the user
                // pressed enter, always capture that and handle it ourselves
                if (isOpen) {
                  if (e.key === 'Enter') {
                    if (highlightedIndex != null) {
                      if (
                        inst.lastChangeType ===
                        Downshift.stateChangeTypes.itemMouseEnter
                      ) {
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
                      onSelect(value, (e.target as HTMLInputElement).value);
                      return onSelectAfter();
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
                if (e.key === 'Escape') {
                  e.nativeEvent['preventDownshiftDefault'] = true;

                  if (!embedded) {
                    e.stopPropagation();
                  }

                  fireUpdate(
                    onUpdate,
                    strict,
                    suggestions,
                    null,
                    getItemId(originalItem),
                  );

                  setValue(getItemName(originalItem));
                  setSelectedItem(findItem(strict, suggestions, originalItem));
                  setHighlightedIndex(null);
                  setIsOpen(embedded ? true : false);
                }
              },
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                const { onChange } = inputProps || {};
                // @ts-expect-error unsure if onChange needs an event or a string
                onChange && onChange(e.target.value);
              },
            }),
          )}
          {isOpen &&
            filtered.length > 0 &&
            (embedded ? (
              <View style={{ marginTop: 5 }} data-testid="autocomplete">
                {renderItems(
                  filtered,
                  getItemProps,
                  highlightedIndex,
                  inputValue,
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
                  minWidth: 200,
                  ...tooltipStyle,
                }}
                {...tooltipProps}
                data-testid="autocomplete"
              >
                {renderItems(
                  filtered,
                  getItemProps,
                  highlightedIndex,
                  inputValue,
                )}
              </Tooltip>
            ))}
        </div>
      )}
    </Downshift>
  );
}

function MultiItem({ name, onRemove }) {
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: colors.b9,
        padding: '2px 4px',
        margin: '2px',
        borderRadius: 4,
      }}
    >
      {name}
      <Button type="button" bare style={{ marginLeft: 1 }} onClick={onRemove}>
        <Remove style={{ width: 8, height: 8 }} />
      </Button>
    </View>
  );
}

type MultiAutocompleteProps = Omit<
  SingleAutocompleteProps,
  'value' | 'onSelect'
> & {
  value: unknown[];
  onSelect: (ids: unknown[], id?: string) => void;
};
function MultiAutocomplete({
  value: selectedItems,
  onSelect,
  suggestions,
  strict,
  ...props
}: MultiAutocompleteProps) {
  let [focused, setFocused] = useState(false);
  let lastSelectedItems = useRef<unknown[]>();

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
      isMulti
      value={null}
      suggestions={suggestions.filter(
        item => !selectedItems.includes(getItemId(item)),
      )}
      onSelect={onAddItem}
      highlightFirst
      strict={strict}
      tooltipProps={{
        forceLayout: lastSelectedItems.current !== selectedItems,
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
              border: '1px solid #d0d0d0',
            },
            focused && {
              border: '1px solid ' + colors.b5,
              boxShadow: '0 1px 1px ' + colors.b7,
            },
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
                ':focus': { border: 0, boxShadow: 'none' },
              },
              props.style,
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
  onClick,
}) {
  return (
    <Button
      style={[
        {
          fontSize: 12,
          color: colors.n10,
          backgroundColor: 'transparent',
          borderColor: colors.n5,
        },
        style,
      ]}
      hoveredStyle={[
        { backgroundColor: 'rgba(200, 200, 200, .25)' },
        hoveredStyle,
      ]}
      onClick={onClick}
    >
      {title}
    </Button>
  );
}

type AutocompleteFooterProps = {
  show?: boolean;
  embedded: boolean;
  children: ReactNode;
};
export function AutocompleteFooter({
  show = true,
  embedded,
  children,
}: AutocompleteFooterProps) {
  return (
    show && (
      <View
        style={[
          { flexShrink: 0 },
          embedded ? { paddingTop: 5 } : { padding: 5 },
        ]}
        onMouseDown={e => e.preventDefault()}
      >
        {children}
      </View>
    )
  );
}

type AutocompleteProps = ComponentProps<typeof SingleAutocomplete> & {
  multi?: boolean;
};
export default function Autocomplete({ multi, ...props }: AutocompleteProps) {
  if (multi) {
    return <MultiAutocomplete {...props} />;
  } else {
    return <SingleAutocomplete {...props} />;
  }
}
