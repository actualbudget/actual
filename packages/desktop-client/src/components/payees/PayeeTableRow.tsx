// @ts-strict-ignore
import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type PayeeEntity } from 'loot-core/src/types/models';

import { useSelectedDispatch } from '../../hooks/useSelected';
import { SvgArrowThinRight, SvgBookmark } from '../../icons/v1';
import { type CSSProperties, theme } from '../../style';
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
            <>
              {ruleCount} associated {ruleCount === 1 ? 'rule' : 'rules'}
            </>
          ) : (
            <>Create rule</>
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
  onUpdate: (
    id: PayeeEntity['id'],
    field: EditablePayeeFields,
    value: unknown,
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
    const [menuOpen, setMenuOpen] = useState(false);
    const [crossOffset, setCrossOffset] = useState(0);
    const [offset, setOffset] = useState(0);

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
        onContextMenu={e => {
          e.preventDefault();
          setMenuOpen(true);
          const rect = e.currentTarget.getBoundingClientRect();
          setCrossOffset(e.clientX - rect.left);
          setOffset(e.clientY - rect.bottom);
        }}
      >
        <Popover
          triggerRef={triggerRef}
          placement="bottom start"
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          crossOffset={crossOffset}
          offset={offset}
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
          value={(payee.transfer_acct ? 'Transfer: ' : '') + payee.name}
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
