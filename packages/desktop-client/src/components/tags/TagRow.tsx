import React, { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgRefreshArrow } from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';

import { type Tag } from 'loot-core/types/models';

import { TagEditor } from './TagEditor';

import {
  SelectCell,
  Row,
  Cell,
  InputCell,
} from '@desktop-client/components/table';
import { useProperFocus } from '@desktop-client/hooks/useProperFocus';
import { useSelectedDispatch } from '@desktop-client/hooks/useSelected';
import {
  createTag,
  deleteTag,
  updateTag,
} from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

type TagRowProps = {
  tag: Tag;
  hovered?: boolean;
  selected?: boolean;
  onHover: (id?: string) => void;
  focusedField: string | null;
  onEdit: (id: string, field: string) => void;
};

export const TagRow = memo(
  ({ tag, hovered, selected, onHover, focusedField, onEdit }: TagRowProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const dispatchSelected = useSelectedDispatch();
    const borderColor = selected ? theme.tableBorderSelected : 'none';

    const colorButtonRef = useRef(null);
    useProperFocus(colorButtonRef, focusedField === 'color');
    const resetButtonRef = useRef(null);
    useProperFocus(resetButtonRef, focusedField === 'select');

    const onUpdate = (description: string) => {
      dispatch(
        tag.id !== '*'
          ? updateTag({ ...tag, description })
          : createTag({
              tag: tag.tag,
              color: tag.color,
              description,
            }),
      );
    };

    return (
      <Row
        data-test-id={tag.id}
        style={{
          borderColor,
          backgroundColor: selected
            ? theme.tableRowBackgroundHighlight
            : hovered
              ? theme.tableRowBackgroundHover
              : theme.tableBackground,
        }}
        collapsed={true}
        onMouseEnter={() => onHover(tag.id)}
        onMouseLeave={() => onHover()}
      >
        {tag.tag !== '*' ? (
          <SelectCell
            exposed={hovered || selected || focusedField === 'select'}
            focused={focusedField === 'select'}
            onSelect={e => {
              dispatchSelected({
                type: 'select',
                id: tag.id,
                isRangeSelect: e.shiftKey,
              });
            }}
            selected={selected}
          />
        ) : (
          <Cell width={20} plain>
            <Button
              variant="bare"
              type="button"
              style={{
                borderWidth: 0,
                backgroundColor: 'transparent',
                marginLeft: 'auto',
              }}
              onPress={() => dispatch(deleteTag(tag))}
              ref={resetButtonRef}
            >
              <SvgRefreshArrow width={13} height={13} />
            </Button>
          </Cell>
        )}

        <Cell width={250} plain style={{ padding: '5px', display: 'block' }}>
          <TagEditor tag={tag} ref={colorButtonRef} />
        </Cell>

        <InputCell
          width="flex"
          name="description"
          textAlign="flex"
          exposed={focusedField === 'description'}
          onExpose={name => onEdit(tag.id, name)}
          value={tag.description || t('No description')}
          valueStyle={
            tag.description
              ? {}
              : { fontStyle: 'italic', color: theme.tableTextLight }
          }
          inputProps={{
            value: tag.description || '',
            onUpdate,
            placeholder: t('No description'),
          }}
        />
      </Row>
    );
  },
);

TagRow.displayName = 'TagRow';
