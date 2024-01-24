import React, { useState, useRef, useEffect, type Dispatch } from 'react';

import { FocusScope } from '@react-aria/focus';

import { mapField, FIELD_TYPES, TYPE_INFO } from 'loot-core/src/shared/rules';
import { titleFirst } from 'loot-core/src/shared/util';
import {
  type RuleConditionEntity,
  type setOp,
} from 'loot-core/src/types/models';

import { theme } from '../../style';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';
import { GenericInput } from '../util/GenericInput';

import { OpButton } from './OpButton';
import { subfieldToOptions } from './subfieldToOptions';

type ConfigureFieldProps = {
  field: string;
  initialSubfield?: string;
  op?: setOp;
  value: string | number;
  dispatch: Dispatch<RuleConditionEntity>;
  onApply: (cond: RuleConditionEntity) => void;
};

export function ConfigureField({
  field,
  initialSubfield = field,
  op,
  value,
  dispatch,
  onApply,
}: ConfigureFieldProps) {
  const [subfield, setSubfield] = useState(initialSubfield);
  const inputRef = useRef<HTMLTextAreaElement>();
  const prevOp = useRef<string>(null);

  useEffect(() => {
    if (prevOp.current !== op && inputRef.current) {
      inputRef.current.focus();
    }
    // prevOp.current = op;
  }, [op]);

  const type: string | undefined = FIELD_TYPES.get(field);
  let ops: Array<setOp> = TYPE_INFO[type].ops.filter(
    (op: setOp) => op !== 'isbetween',
  );

  // Month and year fields are quite hacky right now! Figure out how
  // to clean this up later
  if (subfield === 'month' || subfield === 'year') {
    ops = ['is'];
  }

  return (
    <Tooltip
      position="bottom-left"
      style={{ padding: 15, color: theme.menuItemText }}
      width={275}
      onClose={() => dispatch({ type: 'close' })}
      data-testid="filters-menu-tooltip"
    >
      <FocusScope>
        <View style={{ marginBottom: 10 }}>
          <Stack direction="row" align="flex-start">
            {field === 'amount' || field === 'date' ? (
              <Select
                bare
                options={
                  field === 'amount'
                    ? [
                        ['amount', 'Amount'],
                        ['amount-inflow', 'Amount (inflow)'],
                        ['amount-outflow', 'Amount (outflow)'],
                      ]
                    : field === 'date'
                      ? [
                          ['date', 'Date'],
                          ['month', 'Month'],
                          ['year', 'Year'],
                        ]
                      : []
                }
                value={subfield}
                onChange={sub => {
                  setSubfield(sub);

                  if (sub === 'month' || sub === 'year') {
                    dispatch({ type: 'set-op', op: 'is' });
                  }
                }}
                style={{ borderWidth: 1 }}
              />
            ) : (
              titleFirst(mapField(field))
            )}
            <View style={{ flex: 1 }} />
          </Stack>
        </View>

        <View
          style={{
            color: theme.pageTextLight,
            marginBottom: 10,
          }}
        >
          {field === 'saved' && 'Existing filters will be cleared'}
        </View>

        <Stack
          direction="row"
          align="flex-start"
          spacing={1}
          style={{ flexWrap: 'wrap' }}
        >
          {type === 'boolean' ? (
            <>
              <OpButton
                key="true"
                op="true"
                selected={value !== null}
                onClick={() => {
                  dispatch({ type: 'set-op', op: 'is' });
                  dispatch({ type: 'set-value', value: 'true' });
                }}
              />
              <OpButton
                key="false"
                op="false"
                selected={value === null}
                onClick={() => {
                  dispatch({ type: 'set-op', op: 'is' });
                  dispatch({ type: 'set-value', value: 'false' });
                }}
              />
            </>
          ) : (
            <>
              <Stack
                direction="row"
                align="flex-start"
                spacing={1}
                style={{ flexWrap: 'wrap' }}
              >
                {ops.slice(0, 3).map((currOp: setOp) => (
                  <OpButton
                    key={currOp}
                    op={currOp}
                    selected={currOp === op}
                    onClick={() =>
                      dispatch({ type: 'set-op', op: currOp })
                    }
                  />
                ))}
              </Stack>
              <Stack
                direction="row"
                align="flex-start"
                spacing={1}
                style={{ flexWrap: 'wrap' }}
              >
                {ops.slice(3, ops.length).map((currOp: setOp) => (
                  <OpButton
                    key={currOp}
                    op={currOp}
                    selected={currOp === op}
                    onClick={() => dispatch({ type: 'set-op', op: currOp })}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>

        <form action="#">
          {type !== 'boolean' && (
            <GenericInput
              inputRef={inputRef}
              field={field}
              subfield={subfield}
              type={
                type === 'id' && (op === 'contains' || op === 'doesNotContain')
                  ? 'string'
                  : type
              }
              value={value}
              multi={op === 'oneOf' || op === 'notOneOf'}
              style={{ marginTop: 10 }}
              onChange={(v: string | number) =>
                dispatch({ type: 'set-value', value: v })
              }
            />
          )}

          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ marginTop: 15 }}
          >
            <View style={{ flex: 1 }} />
            <Button
              type="primary"
              onClick={e => {
                e.preventDefault();
                onApply({
                  field,
                  op,
                  value,
                  options: subfieldToOptions(field, subfield),
                });
              }}
            >
              Apply
            </Button>
          </Stack>
        </form>
      </FocusScope>
    </Tooltip>
  );
}
