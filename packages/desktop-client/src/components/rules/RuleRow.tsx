// @ts-strict-ignore
import React, { memo } from 'react';

import { v4 as uuid } from 'uuid';

import { friendlyOp } from 'loot-core/src/shared/rules';
import { type RuleEntity } from 'loot-core/src/types/models';

import { useSelectedDispatch } from '../../hooks/useSelected';
import { SvgRightArrow2 } from '../../icons/v0';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { SelectCell, Row, Field, Cell, CellButton } from '../table';

import { ActionExpression } from './ActionExpression';
import { ConditionExpression } from './ConditionExpression';

type RuleRowProps = {
  rule: RuleEntity;
  hovered?: boolean;
  selected?: boolean;
  onHover?: (id: string | null) => void;
  onEditRule?: (rule: RuleEntity) => void;
};

export const RuleRow = memo(
  ({ rule, hovered, selected, onHover, onEditRule }: RuleRowProps) => {
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
        onMouseEnter={() => onHover && onHover(rule.id)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <SelectCell
          exposed={hovered || selected}
          focused={true}
          onSelect={e => {
            dispatchSelected({ type: 'select', id: rule.id, event: e });
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
                          ...styles.verySmallText,
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
          {/* @ts-expect-error fix this later */}
          <Button as={CellButton} onSelect={() => onEditRule(rule)}>
            Edit
          </Button>
        </Cell>
      </Row>
    );
  },
);

RuleRow.displayName = 'RuleRow';
