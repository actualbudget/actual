import React, { memo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgArrowThinRight } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import type { TagEntity } from 'loot-core/types/models';

import { TagEditor } from './TagEditor';

import {
  Cell,
  CellButton,
  InputCell,
  Row,
  SelectCell,
} from '@desktop-client/components/table';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useProperFocus } from '@desktop-client/hooks/useProperFocus';
import { useSelectedDispatch } from '@desktop-client/hooks/useSelected';
import {
  useDeleteTagMutation,
  useUpdateTagMutation,
} from '@desktop-client/tags';

type TagRowProps = {
  tag: TagEntity;
  hovered?: boolean;
  selected?: boolean;
  onHover: (id?: string) => void;
  focusedField: string | null;
  onEdit: (id: string, field: string) => void;
};

export const TagRow = memo(
  ({ tag, hovered, selected, onHover, focusedField, onEdit }: TagRowProps) => {
    const { t } = useTranslation();
    const dispatchSelected = useSelectedDispatch();
    const borderColor = selected ? theme.tableBorderSelected : 'none';

    const colorButtonRef = useRef(null);
    useProperFocus(colorButtonRef, focusedField === 'color');
    const resetButtonRef = useRef(null);
    useProperFocus(resetButtonRef, focusedField === 'select');

    const triggerRef = useRef(null);
    const { setMenuOpen, menuOpen, handleContextMenu, position } =
      useContextMenu();
    const navigate = useNavigate();
    const { mutate: updateTag } = useUpdateTagMutation();
    const { mutate: deleteTag } = useDeleteTagMutation();

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
      navigate('/accounts', {
        state: {
          goBack: true,
          filterConditions,
        },
      });
    };

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
        onContextMenu={handleContextMenu}
      >
        <Popover
          triggerRef={triggerRef}
          placement="bottom start"
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          {...position}
          style={{ width: 200, margin: 1 }}
          isNonModal
        >
          <Menu
            items={[
              {
                name: 'delete',
                text: t('Delete'),
              },
            ]}
            onMenuSelect={name => {
              switch (name) {
                case 'delete':
                  deleteTag({ id: tag.id });
                  break;
                default:
                  throw new Error(`Unrecognized menu option: ${name}`);
              }
              setMenuOpen(false);
            }}
          />
        </Popover>

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
