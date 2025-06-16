// @ts-strict-ignore
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';

import { type Tag } from 'loot-core/types/models';

import { TagEditor } from './TagEditor';

import { SelectCell, Row, Cell } from '@desktop-client/components/table';
import { useSelectedDispatch } from '@desktop-client/hooks/useSelected';

type TagRowProps = {
  tag: Tag;
  hovered?: boolean;
  selected?: boolean;
  onHover?: (id: string | null) => void;
};

export const TagRow = memo(
  ({ tag, hovered, selected, onHover }: TagRowProps) => {
    const { t } = useTranslation();
    const dispatchSelected = useSelectedDispatch();
    const borderColor = selected ? theme.tableBorderSelected : 'none';
    const backgroundFocus = hovered;

    return (
      <Row
        height="auto"
        style={{
          fontSize: 13,
          zIndex: selected ? 101 : 'auto',
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
        {tag.id ? (
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
          <Cell width={20} />
        )}

        <Cell
          name="tag"
          width={250}
          plain
          style={{ color: theme.tableText, padding: '5px' }}
        >
          <div>
            <TagEditor tag={tag} />
          </div>
        </Cell>

        <Cell name="description" width="flex" plain>
          {tag.description ?? (
            <i style={{ color: theme.tableTextLight }}>{t('No description')}</i>
          )}
        </Cell>
      </Row>
    );
  },
);

TagRow.displayName = 'TagRow';
