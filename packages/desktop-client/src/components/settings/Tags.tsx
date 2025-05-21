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

import { purple700 } from '@desktop-client/style/palette';
import { useTagColor, useTagCSS, useTags } from '@desktop-client/style/tags';

export function TagsSettings() {
  const sidebar = useSidebar();
  const [tags, setTagsPref] = useTags();
  const getTagCSS = useTagCSS();
  const getTagColor = useTagColor();
  const [newTag, setNewTag] = useState('');
  const [newColor, setNewColor] = useState(purple700);
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
                color: theme.errorText,
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
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '8px',
              }}
            >
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
                  marginLeft: 'auto',
                }}
              >
                <SvgAdd width={13} height={13} />
              </Button>
            </View>
          </Form>
          <View
            style={{
              padding: '15px',
              border: '1px solid ' + theme.pillBorderDark,
              borderRadius: '4px',
              background: theme.tableBackground,
              display: 'flex',
              flexDirection: 'row',
              flexFlow: 'row wrap',
              gap: '8px',
            }}
          >
            <View style={{ display: 'inline' }}>
              <ColorPicker
                value={getTagColor('*')}
                onChange={color =>
                  setTagsPref({ ...tags, '*': color.toString('hex') })
                }
              >
                <Text className={getTagCSS('*')}>#Default</Text>
              </ColorPicker>
            </View>

            {Object.keys(tags)
              .filter(tag => tag !== '*')
              .sort()
              .map(tag => (
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
                      width={13}
                      height={13}
                      style={{ color: theme.errorText }}
                    />
                  </Button>
                </View>
              ))}
          </View>
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
