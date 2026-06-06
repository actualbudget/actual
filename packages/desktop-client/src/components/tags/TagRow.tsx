import React, { memo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgArrowThinRight } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import type { TagEntity } from '@actual-app/core/types/models';

import { useContextMenuAction } from '#components/ContextMenu';
import {
  Cell,
  CellButton,
  InputCell,
  Row,
  SelectCell,
} from '#components/table';
import { useNavigate } from '#hooks/useNavigate';
import { useProperFocus } from '#hooks/useProperFocus';
import { useSelectedDispatch, useSelectedItems } from '#hooks/useSelected';
import {
  useDeleteTagsMutation,
  useHideTagsMutation,
  useUnhideTagsMutation,
  useUpdateTagMutation,
} from '#tags';

import { TagEditor } from './TagEditor';

type TagRowProps = {
  tag: TagEntity;
  hovered?: boolean;
  onHover: (id?: string) => void;
  focusedField: string | null;
  onEdit: (id: string, field: string) => void;
};

export const TagRow = memo(
  ({ tag, hovered, onHover, focusedField, onEdit }: TagRowProps) => {
    const { t } = useTranslation();
    const dispatchSelected = useSelectedDispatch();
    const selectedIds = useSelectedItems();
    const selected = selectedIds.has(tag.id);
    const borderColor = selected ? theme.tableBorderSelected : 'none';

    const colorButtonRef = useRef(null);
    useProperFocus(colorButtonRef, focusedField === 'color');
    const resetButtonRef = useRef(null);
    useProperFocus(resetButtonRef, focusedField === 'select');

    const triggerRef = useRef(null);
    const navigate = useNavigate();
    const { mutate: updateTag } = useUpdateTagMutation();
    const { mutate: deleteTags } = useDeleteTagsMutation();
    const { mutate: hideTags } = useHideTagsMutation();
    const { mutate: unhideTags } = useUnhideTagsMutation();

    const onUpdate = (description: string) => {
      updateTag({ tag: { ...tag, description } });
    };

    const onShowActivity = () => {
      const filterConditions = [
        {
          field: 'notes',
          op: 'hasTags',
          value: `#${tag.tag}`,
          type: 'string',
        },
      ];
      void navigate('/accounts', {
        state: {
          goBack: true,
          filterConditions,
        },
      });
    };

    const contextActionIds = selected ? Array.from(selectedIds) : [tag.id];

    useContextMenuAction(
      triggerRef,
      {
        name: 'delete',
        text: t('Delete'),
        onClick: () => deleteTags({ ids: contextActionIds }),
      },
      tag.hidden
        ? {
            name: 'unhide',
            text: t('Unhide'),
            onClick: () => unhideTags({ ids: contextActionIds }),
          }
        : {
            name: 'hide',
            text: t('Hide'),
            onClick: () => hideTags({ ids: contextActionIds }),
          },
    );

    return (
      <Row
        ref={triggerRef}
        data-test-id={tag.id}
        style={{
          borderColor,
          backgroundColor: selected
            ? theme.tableRowBackgroundHighlight
            : hovered
              ? theme.tableRowBackgroundHover
              : theme.tableBackground,
        }}
        collapsed
        onMouseEnter={() => onHover(tag.id)}
        onMouseLeave={() => onHover()}
      >
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
          valueStyle={{
            opacity: tag.hidden ? 0.5 : undefined,
            fontStyle: !tag.description ? 'italic' : undefined,
            color: !tag.description ? theme.tableTextLight : undefined,
          }}
          inputProps={{
            value: tag.description || '',
            onUpdate,
            placeholder: t('No description'),
          }}
        />

        <Cell width="auto" style={{ padding: '0 10px' }} plain>
          <CellButton
            style={{
              borderRadius: 4,
              padding: '3px 6px',
              backgroundColor: theme.noticeBackground,
              border: '1px solid ' + theme.noticeBackground,
              color: theme.noticeTextDark,
              fontSize: 12,
              cursor: 'pointer',
              opacity: tag.hidden ? 0.5 : undefined,
              ':hover': { backgroundColor: theme.noticeBackgroundLight },
            }}
            onSelect={onShowActivity}
          >
            <Text style={{ paddingRight: 5 }}>
              <Trans>View Transactions</Trans>
            </Text>
            <SvgArrowThinRight style={{ width: 8, height: 8 }} />
          </CellButton>
        </Cell>
      </Row>
    );
  },
);

TagRow.displayName = 'TagRow';
