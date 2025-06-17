import React, { memo, useState } from 'react';
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
  onHover?: (id: string | null) => void;
};

export const TagRow = memo(
  ({ tag, hovered, selected, onHover }: TagRowProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const dispatchSelected = useSelectedDispatch();
    const borderColor = selected ? theme.tableBorderSelected : 'none';
    const backgroundFocus = hovered;
    const [exposed, setExposed] = useState(false);

    const onEdit = (description: string) => {
      dispatch(
        tag.id
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
        height="auto"
        style={{
          borderColor,
          backgroundColor: selected
            ? theme.tableRowBackgroundHighlight
            : backgroundFocus
              ? theme.tableRowBackgroundHover
              : theme.tableBackground,
        }}
        collapsed={true}
        onMouseEnter={() => onHover && onHover(tag.id)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        {tag.tag !== '*' ? (
          <SelectCell
            exposed={hovered || selected}
            focused={true}
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
              onClick={() => dispatch(deleteTag(tag))}
            >
              <SvgRefreshArrow width={13} height={13} />
            </Button>
          </Cell>
        )}

        <Cell
          name="tag"
          width={250}
          plain
          style={{ padding: '5px', display: 'block' }}
        >
          <TagEditor tag={tag} />
        </Cell>

        <InputCell
          width="flex"
          name="description"
          textAlign="flex"
          exposed={exposed}
          onExpose={() => setExposed(true)}
          value={tag.description || t('No description')}
          valueStyle={
            tag.description
              ? {}
              : { fontStyle: 'italic', color: theme.tableTextLight }
          }
          inputProps={{
            value: tag.description || '',
            onUpdate: onEdit,
            onBlur: () => setExposed(false),
            placeholder: t('No description'),
          }}
        />
      </Row>
    );
  },
);

TagRow.displayName = 'TagRow';
