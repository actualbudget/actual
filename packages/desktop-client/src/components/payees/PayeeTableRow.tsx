// @ts-strict-ignore
import { memo, useRef, useMemo, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  SvgArrowThinRight,
  SvgBookmark,
  SvgLightBulb,
} from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';

import { type PayeeEntity } from 'loot-core/types/models';

import {
  Cell,
  CellButton,
  CustomCell,
  InputCell,
  Row,
  SelectCell,
} from '@desktop-client/components/table';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import {
  useSelectedDispatch,
  useSelectedItems,
} from '@desktop-client/hooks/useSelected';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type RuleButtonProps = {
  ruleCount: number;
  focused: boolean;
  onEdit: () => void;
  onClick: () => void;
};

function RuleButton({ ruleCount, focused, onEdit, onClick }: RuleButtonProps) {
  const count = ruleCount;

  return (
    <Cell
      name="rule-count"
      width="auto"
      focused={focused}
      style={{ padding: '0 10px' }}
      plain
    >
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
        onEdit={onEdit}
        onSelect={onClick}
      >
        <Text style={{ paddingRight: 5 }}>
          {ruleCount > 0 ? (
            <Trans count={ruleCount}>{{ count }} associated rules</Trans>
          ) : (
            <Trans>Create rule</Trans>
          )}
        </Text>
        <SvgArrowThinRight style={{ width: 8, height: 8 }} />
      </CellButton>
    </Cell>
  );
}

type EditablePayeeFields = keyof Pick<
  PayeeEntity,
  'name' | 'favorite' | 'learn_categories'
>;

type PayeeTableRowProps = {
  payee: PayeeEntity;
  ruleCount: number;
  selected: boolean;
  hovered: boolean;
  editing: boolean;
  focusedField: string;
  onHover?: (id: PayeeEntity['id']) => void;
  onEdit: (id: PayeeEntity['id'], field: string) => void;
  onUpdate: <T extends EditablePayeeFields>(
    id: PayeeEntity['id'],
    field: T,
    value: PayeeEntity[T],
  ) => void;
  onDelete: (ids: PayeeEntity['id'][]) => void;
  onViewRules: (id: PayeeEntity['id']) => void;
  onCreateRule: (id: PayeeEntity['id']) => void;
  style?: CSSProperties;
};

export const PayeeTableRow = memo(
  ({
    payee,
    ruleCount,
    selected,
    hovered,
    editing,
    focusedField,
    onViewRules,
    onCreateRule,
    onHover,
    onDelete,
    onEdit,
    onUpdate,
    style,
  }: PayeeTableRowProps) => {
    const { id } = payee;
    const dispatchSelected = useSelectedDispatch();
    const selectedItems = useSelectedItems();
    const selectedIds = useMemo(() => {
      const ids =
        selectedItems && selectedItems.size > 0 ? selectedItems : [payee.id];
      return Array.from(new Set(ids));
    }, [payee, selectedItems]);

    const borderColor = selected
      ? theme.tableBorderSelected
      : theme.tableBorder;
    const backgroundFocus = hovered || focusedField === 'select';
    const [learnCategories = 'true'] = useSyncedPref('learn-categories');
    const isLearnCategoriesEnabled = String(learnCategories) === 'true';

    const { t } = useTranslation();

    const triggerRef = useRef(null);
    const { setMenuOpen, menuOpen, handleContextMenu, position } =
      useContextMenu();

    return (
      <Row
        ref={triggerRef}
        style={{
          alignItems: 'stretch',
          ...style,
          borderColor,
          backgroundColor: hovered
            ? theme.tableRowBackgroundHover
            : selected
              ? theme.tableRowBackgroundHighlight
              : backgroundFocus
                ? theme.tableRowBackgroundHover
                : theme.tableBackground,
          ...(selected && {
            backgroundColor: theme.tableRowBackgroundHighlight,
            zIndex: 100,
          }),
        }}
        data-focus-key={payee.id}
        onMouseEnter={() => onHover && onHover(payee.id)}
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
              payee.transfer_acct == null && {
                name: 'delete',
                text: t('Delete'),
              },
              payee.transfer_acct == null && {
                name: 'favorite',
                text: payee.favorite ? t('Unfavorite') : t('Favorite'),
              },
              ruleCount > 0 && { name: 'view-rules', text: t('View rules') },
              selectedIds.length === 1 && {
                name: 'create-rule',
                text: t('Create rule'),
              },
              isLearnCategoriesEnabled &&
                (payee.learn_categories
                  ? {
                      name: 'learn',
                      text: t('Disable learning'),
                    }
                  : { name: 'learn', text: t('Enable learning') }),
            ]}
            onMenuSelect={name => {
              switch (name) {
                case 'delete':
                  onDelete(selectedIds);
                  break;
                case 'favorite':
                  selectedIds.forEach(id => {
                    onUpdate(id, 'favorite', !payee.favorite);
                  });
                  break;
                case 'learn':
                  selectedIds.forEach(id => {
                    onUpdate(id, 'learn_categories', !payee.learn_categories);
                  });
                  break;
                case 'view-rules':
                  onViewRules(id);
                  break;
                case 'create-rule':
                  onCreateRule(id);
                  break;
                default:
                  throw new Error(`Unrecognized menu option: ${name}`);
              }
              setMenuOpen(false);
            }}
          />
        </Popover>
        <SelectCell
          exposed={
            payee.transfer_acct == null && (hovered || selected || editing)
          }
          focused={focusedField === 'select'}
          selected={selected}
          onSelect={e => {
            if (payee.transfer_acct != null) {
              return;
            }
            dispatchSelected({
              type: 'select',
              id: payee.id,
              isRangeSelect: e.shiftKey,
            });
          }}
        />
        <CustomCell
          width={20}
          exposed={!payee.transfer_acct}
          onBlur={() => {}}
          onUpdate={() => {}}
          onClick={() => {}}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
          }}
        >
          {() => {
            return (
              <>
                {payee.favorite ? <SvgBookmark style={{ width: 10 }} /> : null}
                {isLearnCategoriesEnabled && !payee.learn_categories && (
                  <Tooltip content={t('Category learning disabled')}>
                    <SvgLightBulb style={{ color: 'red', width: 10 }} />
                  </Tooltip>
                )}
              </>
            );
          }}
        </CustomCell>
        <InputCell
          value={(payee.transfer_acct ? t('Transfer: ') : '') + payee.name}
          valueStyle={
            (!selected &&
              payee.transfer_acct && { color: theme.pageTextSubdued }) ||
            (!selected && !payee.transfer_acct && { color: theme.tableText }) ||
            (selected && { color: theme.tableTextSelected })
          }
          exposed={focusedField === 'name'}
          width="flex"
          onUpdate={value =>
            !payee.transfer_acct && onUpdate(id, 'name', value)
          }
          onExpose={() => onEdit(id, 'name')}
          inputProps={{ readOnly: !!payee.transfer_acct }}
        />
        <RuleButton
          ruleCount={ruleCount}
          focused={focusedField === 'rule-count'}
          onEdit={() => onEdit(id, 'rule-count')}
          onClick={() =>
            ruleCount > 0 ? onViewRules(payee.id) : onCreateRule(payee.id)
          }
        />
      </Row>
    );
  },
);

PayeeTableRow.displayName = 'PayeeTableRow';
