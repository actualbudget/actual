import React, {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';
import { Stack } from '@actual-app/components/stack';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type TagEntity } from 'loot-core/types/models';

import {
  InputCell,
  Row,
  useTableNavigator,
} from '@desktop-client/components/table';
import { useProperFocus } from '@desktop-client/hooks/useProperFocus';
import { useTagCSS } from '@desktop-client/hooks/useTagCSS';
import { useDispatch } from '@desktop-client/redux';
import { createTag } from '@desktop-client/tags/tagsSlice';

type TagCreationRowProps = {
  tags: TagEntity[];
  onClose: () => void;
};

export const TagCreationRow = ({ onClose, tags }: TagCreationRowProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const tagInput = useRef<HTMLInputElement>(null);
  const getTagCSS = useTagCSS();

  const tagNames = useMemo(() => tags.map(tag => tag.tag), [tags]);

  const tableNavigator = useTableNavigator(
    [{ id: 'new-tag' }],
    !tag || tagNames.includes(tag)
      ? ['tag', 'description', 'color', 'cancel']
      : ['tag', 'description', 'color', 'cancel', 'add'],
  );

  const colorButtonRef = useRef(null);
  useProperFocus(colorButtonRef, tableNavigator.focusedField === 'color');
  const addButtonRef = useRef(null);
  useProperFocus(addButtonRef, tableNavigator.focusedField === 'add');
  const cancelButtonRef = useRef(null);
  useProperFocus(cancelButtonRef, tableNavigator.focusedField === 'cancel');

  const resetInputs = () => {
    setColor(null);
    setTag('');
    setDescription('');
    tableNavigator.onEdit('new-tag', 'tag');
  };

  const isTagValid = () => {
    return (
      /^[^#\s]+$/.test(tag) && // accept any char except whitespaces and '#'
      !tagNames.includes(tag) && // does not exists already
      // color is null (default color) or is a 6 char hex color
      (color === null || /^#[0-9a-fA-F]{6}$/.test(color))
    );
  };

  const onAddTag = () => {
    if (!isTagValid()) {
      return;
    }

    dispatch(createTag({ tag, color, description }));
    resetInputs();
  };

  useEffect(() => tableNavigator.onEdit('new-tag', 'tag'), [tableNavigator]);

  return (
    <View
      style={{
        paddingBottom: 1,
        backgroundColor: theme.tableBackground,
      }}
      data-testid="new-tag"
      {...tableNavigator.getNavigatorProps({
        onKeyUp: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Escape') {
            onClose();
          }
          if (e.key === 'Enter' && tag) {
            onAddTag();
          }
        },
      })}
    >
      <Row
        height={34}
        style={{
          padding: '0px 20px',
          width: '100%',
          backgroundColor: theme.tableBackground,
          gap: 5,
        }}
        collapsed={true}
      >
        <InputCell
          width={250}
          name="tag"
          textAlign="flex"
          exposed={tableNavigator.focusedField === 'tag'}
          onExpose={name => tableNavigator.onEdit('new-tag', name)}
          value={tag || t('New tag')}
          valueStyle={
            tag ? {} : { fontStyle: 'italic', color: theme.tableTextLight }
          }
          inputProps={{
            value: tag || '',
            onInput: ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
              setTag(value.replace(/\s/g, '')),
            placeholder: t('New tag'),
            ref: tagInput,
          }}
        />

        <InputCell
          width="flex"
          name="description"
          textAlign="flex"
          exposed={tableNavigator.focusedField === 'description'}
          onExpose={name => tableNavigator.onEdit('new-tag', name)}
          value={description || t('Tag description')}
          valueStyle={
            description
              ? {}
              : { fontStyle: 'italic', color: theme.tableTextLight }
          }
          inputProps={{
            value: description || '',
            onUpdate: setDescription,
            placeholder: t('Tag description'),
          }}
        />
      </Row>
      <Row
        height="auto"
        style={{
          padding: '6px 20px',
          width: '100%',
          backgroundColor: theme.tableBackground,
          gap: 10,
          alignItems: 'center',
          borderBottom: '1px solid ' + theme.tableBorderHover,
        }}
        collapsed={true}
      >
        <Trans>Choose Color:</Trans>
        <ColorPicker
          value={color ?? undefined}
          onChange={color => setColor(color.toString('hex'))}
        >
          <Button
            ref={colorButtonRef}
            variant="bare"
            className={getTagCSS('', { color })}
          >
            #{tag}
          </Button>
        </ColorPicker>
        <Stack
          direction="row"
          align="center"
          justify="flex-end"
          style={{ marginLeft: 'auto' }}
          spacing={2}
        >
          <Button
            variant="normal"
            style={{ padding: '4px 10px' }}
            onPress={onClose}
            data-testid="close-button"
            ref={cancelButtonRef}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            variant="primary"
            style={{ padding: '4px 10px' }}
            onPress={onAddTag}
            data-testid="add-button"
            isDisabled={!isTagValid()}
            ref={addButtonRef}
          >
            <Trans>Add</Trans>
          </Button>
        </Stack>
      </Row>
    </View>
  );
};
