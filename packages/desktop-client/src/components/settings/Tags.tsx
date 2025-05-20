import React, { useState } from 'react';
import { BlockPicker } from 'react-color';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgAdd } from '@actual-app/components/icons/v0';
import { SvgTrash } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { t } from 'i18next';

import { useSidebar } from '../sidebar/SidebarProvider';

import { Setting } from './UI';

import { useTagCSS, useTags } from '@desktop-client/style/tags';

function ColorPickerPopover({
  onChange,
  onExit,
  hexColor,
}: {
  onChange: (color: string) => void;
  onExit: () => void;
  hexColor: string;
}) {
  const [color, setColor] = useState(hexColor);
  // colors from https://materialui.co/colors
  const colors = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
    '#FFEB3B',
    '#FFC107',
    '#FF9800',
    '#FF5722',
    '#795548',
    '#9E9E9E',
    '#607D8B',
  ];

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: '2',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        }}
        onClick={onExit}
      />
      <div style={{ position: 'relative', left: '-25%', top: '10px' }}>
        <BlockPicker
          color={color}
          colors={colors}
          onChange={color => {
            setColor(color.hex);
            onChange(color.hex);
          }}
        />
      </div>
    </div>
  );
}

export function TagsSettings() {
  const sidebar = useSidebar();
  const [tags, setTagsPref] = useTags();
  const getTagCSS = useTagCSS();
  const [newTag, setNewTag] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [errorMsg, setErrorMsg] = useState('');
  const { isNarrowWidth } = useResponsive();
  const [displayColorPicker, setDisplayColorPicker] = useState(false);

  const onTrashTag = (tag: string) => {
    const { [tag]: _, ...newTags } = tags;
    setTagsPref(newTags);
  };

  const onAddTagColor = () => {
    if (!newTag.trim()) {
      setErrorMsg(t('Tag name cannot be empty'));
      return;
    }

    if (!newColor.match(/^#(?:[0-9a-f]{3}){1,2}$/i)) {
      setErrorMsg(t('Invalid HEX color'));
      return;
    }

    setErrorMsg('');
    setTagsPref({ ...tags, [newTag.trim()]: newColor });
    setNewTag('');
  };

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'column',
            gap: '1em',
            width: '100%',
            [`@media (min-width: ${
              sidebar.floating
                ? tokens.breakpoint_small
                : tokens.breakpoint_medium
            })`]: {
              flexDirection: 'column',
            },
          }}
        >
          {errorMsg && (
            <FormError
              style={{
                paddingTop: 5,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
            >
              * {errorMsg}
            </FormError>
          )}
          <form
            style={{
              display: 'flex',
              flexDirection: isNarrowWidth ? 'column' : 'row',
              gap: '1em',
            }}
            onSubmit={e => {
              e.preventDefault();
              onAddTagColor();
            }}
          >
            <Input
              id="tag-field"
              placeholder="tag"
              value={newTag}
              onChangeValue={setNewTag}
            />
            <span style={{ margin: 'auto 0' }}>
              <Button
                type="button"
                variant="bare"
                className={getTagCSS('', newColor)}
                onPress={() => setDisplayColorPicker(prev => !prev)}
              >
                <Trans>Pick Color</Trans>
              </Button>
              {displayColorPicker ? (
                <ColorPickerPopover
                  onChange={setNewColor}
                  onExit={() => setDisplayColorPicker(false)}
                  hexColor={newColor}
                />
              ) : null}
            </span>
            <Button
              variant="bare"
              type="submit"
              style={{
                borderWidth: 0,
                backgroundColor: 'transparent',
              }}
            >
              <SvgAdd width={10} height={10} />
            </Button>
          </form>
          <span>
            <Button variant="bare" className={getTagCSS('')}>
              #Default
            </Button>
          </span>

          {Object.keys(tags).map(tag => (
            <div
              key={tag}
              style={{
                display: 'flex',
                flexDirection: 'row',
              }}
            >
              <span>
                <Button variant="bare" className={getTagCSS(tag)}>
                  #{tag}
                </Button>
              </span>

              <Button
                variant="bare"
                onPress={() => onTrashTag(tag)}
                style={{
                  height: '100%',
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                }}
              >
                <SvgTrash
                  width={10}
                  height={10}
                  style={{ color: theme.errorText }}
                />
              </Button>
            </div>
          ))}
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Tags</strong> User defined tag colors.
        </Trans>
      </Text>
    </Setting>
  );
}
