import React, { useState } from 'react';
import { Form } from 'react-aria-components';
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

import { ColorPicker } from '../../../../component-library/src/ColorPicker';
import { useSidebar } from '../sidebar/SidebarProvider';

import { Setting } from './UI';

import { useTagColor, useTagCSS, useTags } from '@desktop-client/style/tags';

export function TagsSettings() {
  const sidebar = useSidebar();
  const [tags, setTagsPref] = useTags();
  const getTagCSS = useTagCSS();
  const getTagColor = useTagColor();
  const [newTag, setNewTag] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [errorMsg, setErrorMsg] = useState('');
  const { isNarrowWidth } = useResponsive();

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
          <Form
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
            <View style={{ margin: 'auto 0' }}>
              <ColorPicker
                value={newColor}
                onChange={color => setNewColor(color.toString('hex'))}
              >
                <Text className={getTagCSS('', newColor)}>
                  <Trans>Pick Color</Trans>
                </Text>
              </ColorPicker>
            </View>
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
          </Form>
          <View style={{ display: 'inline' }}>
            <Text className={getTagCSS('')}>#Default</Text>
          </View>

          {Object.keys(tags).map(tag => (
            <View
              key={tag}
              style={{
                display: 'flex',
                flexDirection: 'row',
              }}
            >
              <ColorPicker
                value={getTagColor(tag)}
                onChange={color =>
                  setTagsPref({ ...tags, [tag]: color.toString('hex') })
                }
              >
                <Text className={getTagCSS(tag)}>#{tag}</Text>
              </ColorPicker>

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
            </View>
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
