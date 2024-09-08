// @ts-strict-ignore
import React, { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { v4 as uuid } from 'uuid';

import { friendlyOp } from 'loot-core/src/shared/rules';
import { type RuleEntity } from 'loot-core/src/types/models';

import { useSelectedDispatch } from '../../hooks/useSelected';
import { SvgRightArrow2 } from '../../icons/v0';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { SelectCell, Row, Field, Cell } from '../table';

import { ActionExpression } from './ActionExpression';
import { ConditionExpression } from './ConditionExpression';

type RuleRowProps = {
  rule: RuleEntity;
  hovered?: boolean;
  selected?: boolean;
  onHover?: (id: string | null) => void;
  onEditRule?: (rule: RuleEntity) => void;
  onDeleteRule?: (rule: RuleEntity) => void;
};

export const RuleRow = memo(
  ({
    rule,
    hovered,
    selected,
    onHover,
    onEditRule,
    onDeleteRule,
  }: RuleRowProps) => {
    const dispatchSelected = useSelectedDispatch();
    const borderColor = selected ? theme.tableBorderSelected : 'none';
    const backgroundFocus = hovered;

    const actionSplits = rule.actions.reduce(
      (acc, action) => {
        const splitIndex = action['options']?.splitIndex ?? 0;
        acc[splitIndex] = acc[splitIndex] ?? { id: uuid(), actions: [] };
        acc[splitIndex].actions.push(action);
        return acc;
      },
      [] as { id: string; actions: RuleEntity['actions'] }[],
    );
    const hasSplits = actionSplits.length > 1;

    const hasSchedule = rule.actions.some(({ op }) => op === 'link-schedule');

    const { t } = useTranslation();

    const triggerRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [crossOffset, setCrossOffset] = useState(0);
    const [offset, setOffset] = useState(0);

    return (
      <Row
        ref={triggerRef}
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
        onMouseEnter={() => onHover && onHover(rule.id)}
        onMouseLeave={() => onHover && onHover(null)}
        onContextMenu={e => {
          e.preventDefault();
          setMenuOpen(true);
          const rect = triggerRef.current.getBoundingClientRect();
          setCrossOffset(e.clientX - rect.left);
          setOffset(e.clientY - rect.bottom + 10);
        }}
      >
        <Popover
          triggerRef={triggerRef}
          placement="bottom start"
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          crossOffset={crossOffset}
          offset={offset}
          style={{ width: 200 }}
          isNonModal
        >
          <Menu
            items={[
              onEditRule && { name: 'edit', text: t('Edit') },
              onDeleteRule &&
                !hasSchedule && { name: 'delete', text: t('Delete') },
            ]}
            onMenuSelect={name => {
              switch (name) {
                case 'delete':
                  onDeleteRule(rule);
                  break;
                case 'edit':
                  onEditRule(rule);
                  break;
                default:
                  throw new Error(`Unrecognized menu option: ${name}`);
              }
              setMenuOpen(false);
            }}
          />
        </Popover>
        <SelectCell
          exposed={hovered || selected}
          focused={true}
          onSelect={e => {
            dispatchSelected({
              type: 'select',
              id: rule.id,
              isRangeSelect: e.shiftKey,
            });
          }}
          selected={selected}
        />

        <Cell name="stage" width={50} plain style={{ color: theme.tableText }}>
          {rule.stage && (
            <View
              style={{
                alignSelf: 'flex-start',
                margin: 5,
                backgroundColor: theme.pillBackgroundSelected,
                color: theme.pillTextSelected,
                borderRadius: 4,
                padding: '3px 5px',
              }}
            >
              {rule.stage}
            </View>
          )}
        </Cell>

        <Field width="flex" style={{ padding: '15px 0' }} truncate={false}>
          <Stack direction="row" align="center">
            <View
              style={{ flex: 1, alignItems: 'flex-start' }}
              data-testid="conditions"
            >
              {rule.conditions.map((cond, i) => (
                <ConditionExpression
                  key={i}
                  field={cond.field}
                  op={cond.op}
                  inline={true}
                  value={cond.value}
                  options={cond.options}
                  prefix={i > 0 ? friendlyOp(rule.conditionsOp) : null}
                  style={i !== 0 && { marginTop: 3 }}
                />
              ))}
            </View>

            <Text>
              <SvgRightArrow2
                style={{ width: 12, height: 12, color: theme.tableText }}
              />
            </Text>

            <View
              style={{ flex: 1, alignItems: 'flex-start' }}
              data-testid="actions"
            >
              {hasSplits
                ? actionSplits.map((split, i) => (
                    <View
                      key={split.id}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        marginTop: i > 0 ? 3 : 0,
                        padding: '5px',
                        borderColor: theme.tableBorder,
                        borderWidth: '1px',
                        borderRadius: '5px',
                      }}
                    >
                      <Text
                        style={{
                          ...styles.smallText,
                          color: theme.pageTextLight,
                          marginBottom: 6,
                        }}
                      >
                        {i ? `Split ${i}` : 'Apply to all'}
                      </Text>
                      {split.actions.map((action, j) => (
                        <ActionExpression
                          key={j}
                          {...action}
                          style={j !== 0 && { marginTop: 3 }}
                        />
                      ))}
                    </View>
                  ))
                : rule.actions.map((action, i) => (
                    <ActionExpression
                      key={i}
                      {...action}
                      style={i !== 0 && { marginTop: 3 }}
                    />
                  ))}
            </View>
          </Stack>
        </Field>

        <Cell name="edit" plain style={{ padding: '0 15px', paddingLeft: 5 }}>
          <Button onPress={() => onEditRule(rule)}>Edit</Button>
        </Cell>
      </Row>
    );
  },
);

RuleRow.displayName = 'RuleRow';
