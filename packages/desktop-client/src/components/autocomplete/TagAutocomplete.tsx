import { useEffect, useState } from 'react';

import { getNormalisedString } from 'loot-core/shared/normalisation';

import { useTags } from '../../hooks/useTags';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Popover } from '../common/Popover';
import { View } from '../common/View';

function TagAutocomplete({
  onMenuSelect,
  hint,
  clickedOnIt,
  keyPressed,
  onKeyHandled,
}) {
  const tags = useTags();
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (tags && tags.length > 0) {
      let filteredTags = tags;
      if (hint && hint.length > 0) {
        filteredTags = tags.filter(tag =>
          getNormalisedString(tag.tag).includes(getNormalisedString(hint)),
        );
      }
      setSuggestions(
        filteredTags.map(tag => {
          return {
            ...tag,
            name: tag.tag,
          };
        }),
      );
    }
  }, [tags, hint]);

  useEffect(() => {
    if (keyPressed) {
      if (keyPressed === 'ArrowRight') {
        setSelectedIndex(prevIndex => (prevIndex + 1) % suggestions.length);
      } else if (keyPressed === 'ArrowLeft') {
        setSelectedIndex(prevIndex =>
          prevIndex === 0 ? suggestions.length - 1 : prevIndex - 1,
        );
      } else if (keyPressed === 'Tab' || keyPressed === 'Enter') {
        onMenuSelect(suggestions[selectedIndex]);
      }
      if (onKeyHandled) {
        onKeyHandled();
      }
    }
  }, [keyPressed, suggestions, selectedIndex, onMenuSelect, onKeyHandled]);

  return (
    <TagList
      items={suggestions.slice(0, 10)}
      onMenuSelect={onMenuSelect}
      tags={tags}
      clickedOnIt={clickedOnIt}
      selectedIndex={selectedIndex}
    />
  );
}

function TagList({ items, onMenuSelect, tags, clickedOnIt, selectedIndex }) {
  return (
    <View
      style={{
        position: 'relative',
        flexDirection: 'row',
        maxWidth: '200px',
        padding: '5px',
        flexWrap: 'wrap',
        overflow: 'visible',
        alignItems: 'baseline',
      }}
    >
      {items.length === 0 && (
        <View onClick={clickedOnIt} style={{ padding: '10px' }}>
          {tags.length === 0 && (
            <span>No tags found. Tags will be added automatically</span>
          )}
          {tags.length > 0 && <span>No tags found with these terms</span>}
        </View>
      )}
      {items.map((item, index) => (
        <View data-keep-editing="true" key={item.id}>
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
              transform: index === selectedIndex ? 'scale(1)' : 'scale(0.8)',
              textDecorationLine:
                index === selectedIndex ? 'underline' : 'unset',
            }}
          >
            {item.tag}
          </Button>
        </View>
      ))}
    </View>
  );
}

export function TagPopover({
  triggerRef, 
  isOpen, 
  hint, 
  onMenuSelect, 
  keyPressed, 
  onKeyHandled, 
  onClose, 
}) {
  return (
    <Popover triggerRef={triggerRef} isOpen={isOpen} placement="bottom start">
      <TagAutocomplete
        hint={hint}
        clickedOnIt={onClose}
        keyPressed={keyPressed}
        onKeyHandled={onKeyHandled}
        onMenuSelect={onMenuSelect}
      />
    </Popover>
  );
}
