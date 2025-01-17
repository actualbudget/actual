// @ts-strict-ignore
import { memo, useRef, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { type PayeeEntity } from 'loot-core/src/types/models';

import { useContextMenu } from '../../hooks/useContextMenu';
import { useSelectedDispatch } from '../../hooks/useSelected';
import { SvgArrowThinRight, SvgBookmark } from '../../icons/v1';
import { theme } from '../../style';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import {
  Cell,
  CellButton,
  CustomCell,
  InputCell,
  Row,
  SelectCell,
} from '../table';

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

type EditablePayeeFields = keyof Pick<PayeeEntity, 'name' | 'favorite'>;

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
  onDelete: (id: PayeeEntity['id']) => void;
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
    const borderColor = selected
      ? theme.tableBorderSelected
      : theme.tableBorder;
    const backgroundFocus = hovered || focusedField === 'select';

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
              { name: 'create-rule', text: t('Create rule') },
            ]}
            onMenuSelect={name => {
              switch (name) {
                case 'delete':
                  onDelete(id);
                  break;
                case 'favorite':
                  onUpdate(id, 'favorite', payee.favorite ? 0 : 1);
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
          width={10}
          exposed={!payee.transfer_acct}
          onBlur={() => {}}
          onUpdate={() => {}}
          onClick={() => {}}
        >
          {() => {
            if (payee.favorite) {
              return <SvgBookmark />;
            } else {
              return;
            }
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
