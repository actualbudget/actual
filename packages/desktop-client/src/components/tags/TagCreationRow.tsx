import React, { useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Cell, Row } from '@desktop-client/components/table';
import { createTag } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { useTagCSS } from '@desktop-client/style/tags';

export const TagCreationRow = () => {
  const dispatch = useDispatch();
  const getTagCSS = useTagCSS();
  const [tag, setTag] = useState('');
  const [color, setColor] = useState(theme.noteTagDefault);
  const [description, setDescription] = useState<string>();

  const onAddTag = () => {
    if (!tag.trim() || !color.trim()) {
      return;
    }

    dispatch(createTag({ tag, color, description }));
    setColor(theme.noteTagDefault);
    setTag('');
    setDescription('');
  };

  return (
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
      <Row
        height="auto"
        style={{
          width: '100%',
          backgroundColor: theme.tableBackground,
        }}
        collapsed={true}
      >
        <Cell width={20} plain>
          <Button
            variant="bare"
            type="button"
            style={{
              borderWidth: 0,
              backgroundColor: 'transparent',
              marginLeft: 'auto',
            }}
            onClick={onAddTag}
          >
            <SvgAdd width={13} height={13} />
          </Button>
        </Cell>

        <Cell name="color" width={100} plain style={{ padding: '5px' }}>
          <View style={{ display: 'block' }}>
            <ColorPicker
              value={color}
              onChange={color => setColor(color.toString('hex'))}
            >
              <Button variant="bare" className={getTagCSS('', { color })}>
                <Trans>Pick Color</Trans>
              </Button>
            </ColorPicker>
          </View>
        </Cell>

        <Cell name="tag" width={150} plain style={{ padding: '5px' }}>
          <Input
            id="tag-field"
            placeholder="tag"
            width={100}
            value={tag}
            onChangeValue={setTag}
          />
        </Cell>

        <Cell name="description" width="flex" plain style={{ padding: '5px' }}>
          <Input
            id="description-field"
            placeholder="description"
            value={description}
            onChangeValue={setDescription}
          />
        </Cell>
      </Row>
    </Form>
  );
};
