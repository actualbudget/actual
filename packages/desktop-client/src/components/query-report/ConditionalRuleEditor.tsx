import { useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  ConditionalColorScaleRule,
  ConditionalRule,
  ConditionalRuleCondition,
  ConditionalRuleStyling,
  ConditionalSingleRule,
  ConditionOperator,
} from 'loot-core/types/chart-spec';

import { LabeledCheckbox } from '@desktop-client/components/forms/LabeledCheckbox';
import { toFieldType } from '@desktop-client/queries/chart-spec';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type ConditionalRuleEditorProps = {
  result: QueryResult | null;
  rule: ConditionalRule;
  isTable: boolean;
  onSave: (rule: ConditionalRule) => void;
  onCancel: () => void;
};

const OPERATOR_OPTIONS: Array<readonly [ConditionOperator, string]> = [
  ['equals', 'equals'],
  ['not_equals', 'does not equal'],
  ['greater_than', 'is greater than'],
  ['less_than', 'is less than'],
  ['greater_than_or_equal', 'is at least'],
  ['less_than_or_equal', 'is at most'],
  ['between', 'is between'],
  ['is_null', 'is empty'],
  ['is_not_null', 'is not empty'],
];

export function ConditionalRuleEditor({
  result,
  rule,
  isTable,
  onSave,
  onCancel,
}: ConditionalRuleEditorProps) {
  if (rule.type === 'color_scale') {
    return (
      <ColorScaleEditor
        result={result}
        rule={rule}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }
  return (
    <SingleColorEditor
      result={result}
      rule={rule}
      isTable={isTable}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}

function ColorScaleEditor({
  result,
  rule,
  onSave,
  onCancel,
}: {
  result: QueryResult | null;
  rule: ConditionalColorScaleRule;
  onSave: (rule: ConditionalRule) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [field, setField] = useState(rule.field);
  const [minColor, setMinColor] = useState(rule.minColor);
  const [maxColor, setMaxColor] = useState(rule.maxColor);
  const [invert, setInvert] = useState(rule.invert ?? false);

  const numericFieldOptions = (result?.columns ?? [])
    .filter(c => toFieldType(c.type) === 'number')
    .map(c => ({ value: c.name, label: c.name }));

  const handleSave = () => {
    onSave({
      type: 'color_scale',
      field,
      minColor,
      maxColor,
      ...(invert ? { invert: true } : {}),
    });
  };

  return (
    <View
      style={{
        padding: 12,
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 6,
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        <Trans>Color scale rule</Trans>
      </div>
      <Field label={t('Applies to')}>
        <Select
          value={field}
          options={numericFieldOptions.map(o => [o.value, o.label] as const)}
          onChange={setField}
        />
      </Field>
      <Field label={t('Min color')}>
        <Input value={minColor} onChangeValue={setMinColor} />
      </Field>
      <Field label={t('Max color')}>
        <Input value={maxColor} onChangeValue={setMaxColor} />
      </Field>
      <LabeledCheckbox
        id="conditional-rule-invert"
        checked={invert}
        onChange={() => setInvert(v => !v)}
      >
        <Trans>Invert</Trans>
      </LabeledCheckbox>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="primary" onPress={handleSave}>
          <Trans>Save</Trans>
        </Button>
        <Button onPress={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </View>
    </View>
  );
}

function SingleColorEditor({
  result,
  rule,
  isTable,
  onSave,
  onCancel,
}: {
  result: QueryResult | null;
  rule: ConditionalSingleRule;
  isTable: boolean;
  onSave: (rule: ConditionalRule) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [field, setField] = useState(rule.field);
  const [conditions, setConditions] = useState<ConditionalRuleCondition[]>(
    rule.conditions.length > 0
      ? rule.conditions
      : [{ operator: 'equals', value: '' }],
  );
  const [styling, setStyling] = useState<ConditionalRuleStyling>(rule.styling);
  const [formatEntireRow, setFormatEntireRow] = useState(
    rule.formatEntireRow ?? false,
  );

  const fieldOptions = (result?.columns ?? []).map(c => ({
    value: c.name,
    label: c.name,
  }));

  const updateCondition = (
    index: number,
    patch: Partial<ConditionalRuleCondition>,
  ) => {
    setConditions(prev =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { operator: 'equals', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const updateStyling = (patch: Partial<ConditionalRuleStyling>) => {
    setStyling(prev => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    onSave({
      type: 'single_color',
      field,
      conditions: conditions.filter(
        c =>
          c.operator === 'is_null' ||
          c.operator === 'is_not_null' ||
          c.value !== '',
      ),
      styling,
      ...(isTable && formatEntireRow ? { formatEntireRow: true } : {}),
    });
  };

  return (
    <View
      style={{
        padding: 12,
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 6,
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        <Trans>Single color rule</Trans>
      </div>
      <Field label={t('Applies to')}>
        <Select
          value={field}
          options={fieldOptions.map(o => [o.value, o.label] as const)}
          onChange={setField}
        />
      </Field>
      <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>Conditions (all must match)</Trans>
      </div>
      {conditions.map((condition, idx) => (
        <View
          key={idx}
          style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}
        >
          <Select
            value={condition.operator}
            options={OPERATOR_OPTIONS}
            onChange={v => updateCondition(idx, { operator: v })}
          />
          {condition.operator !== 'is_null' &&
            condition.operator !== 'is_not_null' && (
              <Input
                value={String(condition.value ?? '')}
                onChangeValue={v => updateCondition(idx, { value: v })}
                style={{ width: 100 }}
              />
            )}
          {condition.operator === 'between' && (
            <Input
              value={String(condition.valueMax ?? '')}
              onChangeValue={v => updateCondition(idx, { valueMax: v })}
              style={{ width: 100 }}
            />
          )}
          <Button onPress={() => removeCondition(idx)}>
            <Trans>Remove</Trans>
          </Button>
        </View>
      ))}
      <Button onPress={addCondition}>
        <Trans>Add another condition</Trans>
      </Button>
      <div style={{ fontSize: 12, color: theme.pageTextSubdued, marginTop: 4 }}>
        <Trans>Styling</Trans>
      </div>
      <Field label={t('Text color (hex)')}>
        <Input
          value={styling.textColor ?? ''}
          onChangeValue={v =>
            updateStyling(v ? { textColor: v } : { textColor: undefined })
          }
        />
      </Field>
      <Field label={t('Background color (hex)')}>
        <Input
          value={styling.backgroundColor ?? ''}
          onChangeValue={v =>
            updateStyling(
              v ? { backgroundColor: v } : { backgroundColor: undefined },
            )
          }
        />
      </Field>
      <LabeledCheckbox
        id="conditional-rule-bold"
        checked={styling.bold ?? false}
        onChange={() => updateStyling({ bold: !styling.bold })}
      >
        <Trans>Bold</Trans>
      </LabeledCheckbox>
      <LabeledCheckbox
        id="conditional-rule-italic"
        checked={styling.italic ?? false}
        onChange={() => updateStyling({ italic: !styling.italic })}
      >
        <Trans>Italic</Trans>
      </LabeledCheckbox>
      {isTable && (
        <LabeledCheckbox
          id="conditional-rule-row"
          checked={formatEntireRow}
          onChange={() => setFormatEntireRow(v => !v)}
        >
          <Trans>Format entire row</Trans>
        </LabeledCheckbox>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="primary" onPress={handleSave}>
          <Trans>Save</Trans>
        </Button>
        <Button onPress={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </View>
    </View>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <View>
      <div
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {children}
    </View>
  );
}
