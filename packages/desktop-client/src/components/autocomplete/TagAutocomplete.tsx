import { useTags } from '../../hooks/useTags';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { View } from '../common/View';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../common/Button2';
import { theme } from '../../style';
import { CompactPicker, SketchPicker } from 'react-color';
import { useDispatch } from 'react-redux';
import { updateTags } from 'loot-core/client/actions';

export function TagAutocomplete({ onMenuSelect, hint, clickedOnIt }) {
  const tags = useTags();
  const [suggestions, setSuggestions] = useState([]);

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

  return (
    <TagList
      items={suggestions}
      onMenuSelect={onMenuSelect}
      tags={tags}
      clickedOnIt={clickedOnIt}
    />
  );
}

function TagList({ items, onMenuSelect, tags, clickedOnIt }) {
  const [showColors, setShowColors] = useState(false);
  const triggerRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const dispatch = useDispatch();

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item);

    // Calculate position of the clicked item
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerPosition({
      top: rect.bottom, // Position the picker right below the selected item
      left: rect.left, // Align the picker with the left side of the selected item
    });

    setShowColors(true);
  };

  return (
    <View
      style={{
        position: 'relative',
        flexDirection: 'row',
        maxWidth: '200px',
        padding: '5px',
        flexWrap: 'wrap',
        overflow: 'visible',
      }}
    >
      {items.length === 0 && (
        <View onClick={clickedOnIt} style={{ padding: '10px' }}>
          {tags.length === 0 && (
            <span>No tags found. Tags will be added automatically</span>
          )}
          {tags.length > 0 && <span>No tags found with this terms</span>}
        </View>
      )}
      {items.map(item => (
        <View
          data-keep-editing="true"
          key={item.id}
          ref={triggerRef}
          onContextMenu={e => handleContextMenu(e, item)}
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
              padding: '3px 7px',
              userSelect: 'none',
              textOverflow: 'ellipsis',
              maxWidth: '150px',
              backgroundColor: item.color ?? theme.noteTagBackground,
              color: item.textColor ?? theme.noteTagText,
              cursor: 'pointer',
            }}
          >
            {item.tag}
          </Button>
        </View>
      ))}
      {showColors && selectedItem && (
        <View
          data-keep-editing="true"
          style={{
            position: 'fixed', // Use fixed positioning to float above other content
            top: pickerPosition.top,
            left: pickerPosition.left,
            zIndex: 1000, // Ensure it's above other elements
          }}
        >
          <CompactPicker
            color={selectedItem.color ?? theme.noteTagBackground}
            onChange={newColor => {
              selectedItem.color = newColor.hex;
              dispatch(updateTags(selectedItem));
            }}
            onChangeComplete={color => {
              setShowColors(false);
            }}
          />
        </View>
      )}
    </View>
  );
}
