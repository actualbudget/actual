import { type RefObject, useEffect, useRef, useState } from 'react';
import { TwitterPicker } from 'react-color';
import { useDispatch } from 'react-redux';

import { updateTags } from 'loot-core/client/actions';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { extractAllTags, TAGCOLORS } from 'loot-core/shared/tag';

import { useTags } from '../../hooks/useTags';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

type Tag = {
  id: string;
  tag: string;
  color: string;
  textColor: string;
  hoverColor: string;
};

type TagAutocompleteProps = {
  onMenuSelect: (item: Tag) => void;
  hint: string;
  clickedOnIt: () => void;
  keyPressed: string | null;
  onKeyHandled: () => void;
  element: HTMLElement | null;
  value: string | null;
};

function TagAutocomplete({
  onMenuSelect,
  hint,
  clickedOnIt,
  keyPressed,
  onKeyHandled,
  element,
  value,
}: TagAutocompleteProps) {
  const tags = useTags();
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (tags && tags.length > 0) {
      let filteredTags = tags;
      if (hint && hint.length > 0) {
        filteredTags = tags.filter(tag =>
          getNormalisedString(tag.tag).includes(getNormalisedString(hint)),
        );
      }
      setSuggestions(
        filteredTags.map(tag => ({
          ...tag,
          name: tag.tag,
        })),
      );
    }
  }, [tags, hint]);

  useEffect(() => {
    const minIndex = 0;

    if (keyPressed) {
      if (keyPressed === 'ArrowRight') {
        if (selectedIndex + 1 === Math.min(suggestions.length, 10)) {
          setSelectedIndex(minIndex);
        } else {
          setSelectedIndex(
            prevIndex => (prevIndex + 1) % Math.min(suggestions.length, 10),
          );
        }
      } else if (keyPressed === 'ArrowLeft') {
        setSelectedIndex(prevIndex =>
          prevIndex === minIndex
            ? Math.min(suggestions.length, 10) - 1
            : prevIndex - 1,
        );
      } else if (keyPressed === 'Tab' || keyPressed === 'Enter') {
        onMenuSelect(suggestions[selectedIndex]);
      }
      if (onKeyHandled) {
        onKeyHandled();
      }
    }
  }, [
    keyPressed,
    suggestions,
    selectedIndex,
    onMenuSelect,
    onKeyHandled,
    hint,
  ]);

  return (
    <TagList
      items={suggestions.slice(0, 10)}
      onMenuSelect={onMenuSelect}
      tags={tags}
      clickedOnIt={clickedOnIt}
      selectedIndex={selectedIndex}
      // hint={hint}
      element={element}
      value={value}
    />
  );
}

type TagListProps = {
  items: Tag[];
  onMenuSelect: (item: Tag) => void;
  tags: Tag[];
  clickedOnIt: () => void;
  selectedIndex: number;
  // hint: string;
  element: HTMLElement | null;
  value: string | null;
};

function TagList({
  items,
  onMenuSelect,
  tags,
  clickedOnIt,
  selectedIndex,
  // hint,
  element,
  value,
}: TagListProps) {
  const [width, setWidth] = useState(0);
  const [showColors, setShowColors] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uncommitedTags, setUncommitedTags] = useState([]);
  const colorRef = useRef(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (value && tags) {
      let list = extractAllTags(value);
      list = list
        .filter(item => item.length > 1)
        .filter(item => !tags.some(tag => tag.tag === item));
      setUncommitedTags(list);
    }
  }, [value, tags]);

  useEffect(() => {
    if (!element) return;

    const handleResize = () => {
      if (element) {
        setWidth(element.offsetWidth);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      if (element) {
        setWidth(element.offsetWidth);
      }
    });

    if (element) {
      resizeObserver.observe(element);
    }

    return () => {
      window.removeEventListener('resize', handleResize);

      if (resizeObserver && element) {
        resizeObserver.unobserve(element);
        resizeObserver.disconnect();
      }
    };
  }, [element]);

  return (
    <View
      style={{
        position: 'relative',
        maxWidth: width - 10,
        flexDirection: 'column',
        flexWrap: 'wrap',
        overflow: 'visible',
        alignItems: 'baseline',
      }}
    >
      {items.length === 0 && tags.length === 0 && (
        <View onClick={clickedOnIt} style={{ padding: '10px' }}>
          {tags.length === 0 && (
            <span
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
              }}
            >
              Tags will be added when saving the transaction.
            </span>
          )}
          {/* {tags.length > 0 && (
            <span style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
            }}>No tags created with these terms ({hint})</span>
          )} */}
        </View>
      )}
      {items.length > 0 && (
        <View
          style={{
            position: 'relative',
            flexDirection: 'row',
            justifyContent: 'space-around',
            padding: '5px',
            flexWrap: 'wrap',
            overflow: 'visible',
            alignItems: 'baseline',
          }}
        >
          {items.map((item, index) => (
            <View
              data-keep-editing="true"
              key={item.id}
              onContextMenu={e => {
                debugger;
                colorRef.current = e.target;
                setSelectedItem(item);
                setShowColors(true);
                e.preventDefault();
              }}
            >
              <Button
                onPress={() => onMenuSelect(item)}
                style={{
                  border: 0,
                  borderRadius: 16,
                  margin: '2px',
                  display: 'inline-block',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  padding: '5px 11px',
                  userSelect: 'none',
                  textOverflow: 'ellipsis',
                  maxWidth: '150px',
                  backgroundColor: item.color ?? theme.noteTagBackground,
                  color: item.textColor ?? theme.noteTagText,
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, background-color 0.3s ease',
                  transform:
                    index === selectedIndex ? 'scale(1.1)' : 'scale(1)',
                  zIndex: index === selectedIndex ? '1000' : 'unset',
                  textDecorationLine:
                    index === selectedIndex ? 'underline' : 'unset',
                }}
              >
                {item.tag}
              </Button>
            </View>
          ))}
        </View>
      )}
      {uncommitedTags.length > 0 && (
        <>
          <Text
            style={{
              ...styles.verySmallText,
              color: theme.pageTextLight,
              width: '100%',
              padding: 5,
            }}
          >
            Tags that will be created when saving
          </Text>
          <View
            style={{
              position: 'relative',
              flexDirection: 'row',
              justifyContent: 'space-around',
              padding: '5px',
              flexWrap: 'wrap',
              overflow: 'visible',
              alignItems: 'baseline',
            }}
          >
            {uncommitedTags.map((item, index) => (
              <View data-keep-editing="true" key={index}>
                <span
                  style={{
                    border: 0,
                    borderRadius: 16,
                    margin: '2px',
                    display: 'inline-block',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    padding: '3px 9px',
                    userSelect: 'none',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px',
                    backgroundColor: theme.noteTagBackground,
                    color: theme.noteTagText,
                    fontSize: '10px',
                  }}
                >
                  {item}
                </span>
              </View>
            ))}
          </View>
        </>
      )}
      {showColors && selectedItem && (
        <Popover
          data-keep-editing="true"
          triggerRef={colorRef}
          isOpen={showColors}
          onOpenChange={isOpen => setShowColors(isOpen)}
          placement="bottom start"
          offset={10}
          // style={{ marginLeft: pickerPosition.left }}
        >
          <TwitterPicker
            color={selectedItem.color ?? theme.noteTagBackground}
            colors={TAGCOLORS}
            onChange={newColor => {
              selectedItem.color = newColor.hex;
              dispatch(updateTags(selectedItem));
            }}
            onChangeComplete={() => {
              setShowColors(false);
            }}
          />
        </Popover>
      )}
    </View>
  );
}

type TagPopoverProps = {
  triggerRef: RefObject<HTMLElement>;
  isOpen: boolean;
  hint: string;
  onMenuSelect: (item: Tag) => void;
  keyPressed: string | null;
  onKeyHandled: () => void;
  onClose: () => void;
  value: string | null;
};

export function TagPopover({
  triggerRef,
  isOpen,
  hint,
  onMenuSelect,
  keyPressed,
  onKeyHandled,
  onClose,
  value,
}: TagPopoverProps) {
  const [showPopOver, setShowPopOver] = useState(isOpen);

  useEffect(() => {
    setShowPopOver(isOpen);
  }, [isOpen]);

  return (
    <Popover
      triggerRef={triggerRef}
      isOpen={showPopOver}
      onOpenChange={isOpen => setShowPopOver(isOpen)}
      placement="bottom start"
    >
      <TagAutocomplete
        value={value}
        hint={hint}
        clickedOnIt={onClose}
        keyPressed={keyPressed}
        onKeyHandled={onKeyHandled}
        onMenuSelect={onMenuSelect}
        element={triggerRef?.current}
      />
    </Popover>
  );
}
