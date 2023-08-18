import React, { memo } from 'react';

import { friendlyOp } from 'loot-core/src/shared/rules';
import { type RuleEntity } from 'loot-core/src/types/models';

import { useSelectedDispatch } from '../../hooks/useSelected';
import ArrowRight from '../../icons/v0/RightArrow2';
import { theme } from '../../style';
import Button from '../common/Button';
import Stack from '../common/Stack';
import Text from '../common/Text';
import View from '../common/View';
import { SelectCell, Row, Field, Cell, CellButton } from '../table';

import ActionExpression from './ActionExpression';
import ConditionExpression from './ConditionExpression';

type RuleRowProps = {
  rule: RuleEntity;
  hovered?: boolean;
  selected?: boolean;
  onHover?: (id: string | null) => void;
  onEditRule?: (rule: RuleEntity) => void;
};

const RuleRow = memo(
  ({ rule, hovered, selected, onHover, onEditRule }: RuleRowProps) => {
    let dispatchSelected = useSelectedDispatch();
    let borderColor = selected ? theme.tableBorderSelected : 'none';
    let backgroundFocus = hovered;

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
              <ArrowRight
                style={{ width: 12, height: 12, color: theme.tableText }}
              />
            </Text>

            <View
              style={{ flex: 1, alignItems: 'flex-start' }}
              data-testid="actions"
            >
              {rule.actions.map((action, i) => (
                <ActionExpression
                  key={i}
                  field={action.field}
                  op={action.op}
                  value={action.value}
                  options={action.options}
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

export default RuleRow;
