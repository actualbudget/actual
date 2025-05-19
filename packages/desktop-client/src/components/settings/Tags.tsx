import React, { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgTrash } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { useSidebar } from '../sidebar/SidebarProvider';

import { Setting } from './UI';

import { useTagCSS, useTags } from '@desktop-client/style/tags';

export function TagsSettings() {
  const sidebar = useSidebar();
  const [tags, setTagsPref] = useTags();
  const getTagCSS = useTagCSS();

  const onTrashTag = (tag: string) => {
    const { [tag]: _, ...newTags } = tags;
    setTagsPref(newTags);
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
          <span>
            <Button variant="bare" className={getTagCSS('')} onPress={() => {}}>
              #Default
            </Button>
          </span>

          {Object.keys(tags).map((tag, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'row',
              }}
            >
              <span>
                <Button
                  variant="bare"
                  className={getTagCSS(tag)}
                  onPress={() => {}}
                >
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
