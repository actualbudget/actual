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
import { css } from 'glamor';

import Remove from '../../icons/v2/Remove';
import { theme, type CSSProperties } from '../../style';
import Button from '../common/Button';
import Input from '../common/Input';
import View from '../common/View';
import { Tooltip } from '../tooltips';

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

  onUpdate?.(selected, value);
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
            // Downshift calls `setTimeout(..., 250)` in the `onMouseMove`
            // event handler they set on this element. When this code runs
            // in WebKit on touch-enabled devices, taps on this element end
            // up not triggering the `onClick` event (and therefore delaying
            // response to user input) until after the `setTimeout` callback
            // finishes executing. This is caused by content observation code
            // that implements various strategies to prevent the user from
            // accidentally clicking content that changed as a result of code
            // run in the `onMouseMove` event.
            //
            // Long story short, we don't want any delay here between the user
            // tapping and the resulting action being performed. It turns out
            // there's some "fast path" logic that can be triggered in various
            // ways to force WebKit to bail on the content observation process.
            // One of those ways is setting `role="button"` (or a number of
            // other aria roles) on the element, which is what we're doing here.
            //
            // ref:
            // * https://github.com/WebKit/WebKit/blob/447d90b0c52b2951a69df78f06bb5e6b10262f4b/LayoutTests/fast/events/touch/ios/content-observation/400ms-hover-intent.html
            // * https://github.com/WebKit/WebKit/blob/58956cf59ba01267644b5e8fe766efa7aa6f0c5c/Source/WebCore/page/ios/ContentChangeObserver.cpp
            // * https://github.com/WebKit/WebKit/blob/58956cf59ba01267644b5e8fe766efa7aa6f0c5c/Source/WebKit/WebProcess/WebPage/ios/WebPageIOS.mm#L783
            role="button"
            key={name}
            className={`${css({
              padding: 5,
              cursor: 'default',
              backgroundColor:
                highlightedIndex === index
                  ? theme.alt2MenuItemBackgroundHover
                  : null,
            })}`}
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
    getItemProps: (arg: { item: unknown }) => ComponentProps<typeof View>,
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
  closeOnBlur?: boolean;
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
  closeOnBlur = true,
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
        <div className={`view ${css({ display: 'flex' })}`} {...containerProps}>
          {renderInput(
            getInputProps({
              focused,
              ...inputProps,
              onFocus: e => {
                inputProps.onFocus?.(e);

                if (openOnFocus) {
                  setIsOpen(true);
                }
              },
              onBlur: e => {
                // Should this be e.nativeEvent
                e.preventDownshiftDefault = true;
                inputProps.onBlur?.(e);

                if (!closeOnBlur) return;

                if (!tableBehavior) {
                  if (e.target.value === '') {
                    onSelect?.(null, e.target.value);
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
                      onKeyDown?.(e);
                    }
                  } else if (shouldSaveFromKey(e)) {
                    e.preventDefault();
                    onKeyDown?.(e);
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
                onChange?.(e.target.value);
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
                  backgroundColor: theme.menuItemText,
                  color: theme.tableBackground,
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
        backgroundColor: theme.pillBackgroundSelected,
        padding: '2px 4px',
        margin: '2px',
        borderRadius: 4,
      }}
    >
      {name}
      <Button type="bare" style={{ marginLeft: 1 }} onClick={onRemove}>
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

    prevOnKeyDown?.(e);
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
      renderInput={inputProps => (
        <View
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.tableBackground,
            borderRadius: 4,
            border: '1px solid ' + theme.formInputBorder,
            ...(focused && {
              border: '1px solid ' + theme.formInputBorderSelected,
              boxShadow: '0 1px 1px ' + theme.formInputShadowSelected,
            }),
          }}
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
            {...inputProps}
            onKeyDown={e => onKeyDown(e, inputProps.onKeyDown)}
            onFocus={e => {
              setFocused(true);
              inputProps.onFocus(e);
            }}
            onBlur={e => {
              setFocused(false);
              inputProps.onBlur(e);
            }}
            style={{
              flex: 1,
              minWidth: 30,
              border: 0,
              ':focus': { border: 0, boxShadow: 'none' },
              ...inputProps.style,
            }}
          />
        </View>
      )}
    />
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
        style={{
          flexShrink: 0,
          ...(embedded ? { paddingTop: 5 } : { padding: 5 }),
        }}
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
