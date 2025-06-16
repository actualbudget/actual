import React, { useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';
import { FormError } from '@actual-app/components/form-error';
import {
  SvgAdd,
  SvgClose,
  SvgRefresh,
  SvgTrash,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { t } from 'i18next';

import { type Tag } from 'loot-core/types/models';

import { Setting } from './UI';

import { useSidebar } from '@desktop-client/components/sidebar/SidebarProvider';
import {
  createTag,
  deleteTag,
  updateTag,
} from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { useTagCSS, useTags } from '@desktop-client/style/tags';

type TagEditorProps = {
  tag?: Tag;
  mode: 'trash' | 'edit';
};

const defaultTag: Tag = {
  id: '',
  tag: '*',
  color: theme.noteTagDefault,
};
const TagEditor = ({ tag = defaultTag, mode }: TagEditorProps) => {
  const getTagCSS = useTagCSS();
  const dispatch = useDispatch();

  const onTrashTag = (tag: Tag) => {
    dispatch(deleteTag(tag));
  };

  const formattedTag = <>#{tag.tag === '*' ? t('Default') : tag.tag}</>;

  if (mode === 'edit') {
    return (
      <ColorPicker
        value={tag.color}
        onChange={color => {
          dispatch(
            tag.id
              ? updateTag({ ...tag, color: color.toString('hex') })
              : createTag({
                  tag: tag.tag,
                  color: color.toString('hex'),
                }),
          );
        }}
      >
        <Button variant="bare" className={getTagCSS(tag.tag)}>
          {formattedTag}
        </Button>
      </ColorPicker>
    );
  } else {
    return (
      <Button
        variant="bare"
        className={getTagCSS(tag.tag)}
        onPress={() => onTrashTag(tag)}
      >
        {formattedTag}
        &nbsp;
        {tag.tag !== '*' ? (
          <SvgClose width={10} height={10} />
        ) : (
          <SvgRefresh width={10} height={10} />
        )}
      </Button>
    );
  }
};

export function TagsSettings() {
  const sidebar = useSidebar();
  const tags = useTags();
  const getTagCSS = useTagCSS();
  const [newTag, setNewTag] = useState('');
  const [newColor, setNewColor] = useState(theme.noteTagDefault);
  const [errorMsg, setErrorMsg] = useState('');
  const [trashMode, setTrashMode] = useState(false);
  const dispatch = useDispatch();

  const onAddTag = () => {
    if (!newTag.trim()) {
      setErrorMsg(t('Tag name cannot be empty'));
      return;
    }

    if (!newColor.match(/^#(?:[0-9a-f]{3}){1,2}$/i)) {
      setErrorMsg(t('Invalid HEX color'));
      return;
    }

    if (tags.some(tag => tag.tag === newTag)) {
      setErrorMsg(t('Tag already exists'));
      return;
    }

    setErrorMsg('');
    dispatch(createTag({ tag: newTag, color: newColor }));
    setNewTag('');
  };

  const actionButtonStyle = {
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginLeft: 'auto',
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
              flexDirection: 'row',
              gap: '1em',
            }}
            onSubmit={e => {
              e.preventDefault();
              onAddTag();
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
                  <Button
                    variant="bare"
                    className={getTagCSS('', {
                      color: newColor,
                    })}
                  >
                    <Trans>Pick Color</Trans>
                  </Button>
                </ColorPicker>
              </View>
              <Button variant="bare" type="submit" style={actionButtonStyle}>
                <SvgAdd width={13} height={13} />
              </Button>
            </View>
            <Button
              variant="bare"
              type="button"
              style={actionButtonStyle}
              onPress={() => setTrashMode(!trashMode)}
            >
              <SvgTrash
                width={13}
                height={13}
                style={trashMode ? { color: theme.errorText } : {}}
              />
            </Button>
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
              <TagEditor
                tag={tags.find(tag => tag.tag === '*')}
                mode={trashMode ? 'trash' : 'edit'}
              />
            </View>

            {tags
              .filter(tag => tag.tag !== '*')
              .map(tag => (
                <View
                  key={tag.tag}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                  }}
                >
                  <TagEditor tag={tag} mode={trashMode ? 'trash' : 'edit'} />
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
