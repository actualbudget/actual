import React, { memo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgRefreshArrow, SvgViewShow } from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { type Tag } from 'loot-core/types/models';

import { TagEditor } from './TagEditor';

import {
  SelectCell,
  Row,
  Cell,
  InputCell,
  CellButton,
} from '@desktop-client/components/table';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
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

    const triggerRef = useRef(null);
    const { setMenuOpen, menuOpen, handleContextMenu, position } =
      useContextMenu();
    const navigate = useNavigate();

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
        collapsed={true}
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
                text: tag.tag !== '*' ? t('Delete') : t('Reset'),
              },
            ]}
            onMenuSelect={name => {
              switch (name) {
                case 'delete':
                  dispatch(deleteTag(tag));
                  break;
                default:
                  throw new Error(`Unrecognized menu option: ${name}`);
              }
              setMenuOpen(false);
            }}
          />
        </Popover>
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
        {tag.tag !== '*' && (
          <Cell
            name="rule-count"
            width="auto"
            style={{ padding: '0 10px' }}
            plain
          >
            <CellButton
              onSelect={onShowActivity}
              style={{
                cursor: 'pointer',
                fontSize: 11,
                color: theme.tableTextLight,
                ':hover': { borderBottom: '1px solid' },
              }}
              bare
            >
              <Text style={{ paddingRight: 5 }}>
                <Trans>View Transactions</Trans>
              </Text>
              <SvgViewShow style={{ width: 10, height: 10 }} />
            </CellButton>
          </Cell>
        )}
      </Row>
    );
  },
);

TagRow.displayName = 'TagRow';
