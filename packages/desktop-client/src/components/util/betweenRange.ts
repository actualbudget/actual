import { currentDay } from '@actual-app/core/shared/months';
import { FIELD_TYPES } from '@actual-app/core/shared/rules';
import type { FieldValueTypes } from '@actual-app/core/types/models';

export type DateRange = { num1: string; num2: string };
export type AmountRange = { num1: number; num2: number };

/**
 * Pull the two bounds out of whatever an `isbetween` condition is currently
 * holding. The value can be half-formed — an API- or hand-created filter, or a
 * value the op reducer hasn't converted yet — so a missing bound comes back as
 * `undefined` and a bare single value seeds both.
 */
function readBounds(value: unknown): [unknown, unknown] {
  if (typeof value === 'object' && value !== null) {
    return [
      'num1' in value ? value.num1 : undefined,
      'num2' in value ? value.num2 : undefined,
    ];
  }
  return [value, value];
}

/**
 * `isbetween` needs both bounds. Fill in whatever is missing — falling back to
 * the other bound, then to an empty default — so the range that gets submitted
 * always matches the one the inputs display.
 */
export function normalizeDateRange(value: unknown): DateRange {
  const [rawNum1, rawNum2] = readBounds(value);
  const isBound = (bound: unknown): bound is string =>
    typeof bound === 'string' && bound !== '';

  const num1 = isBound(rawNum1)
    ? rawNum1
    : isBound(rawNum2)
      ? rawNum2
      : currentDay();

  return { num1, num2: isBound(rawNum2) ? rawNum2 : num1 };
}

/** The amount counterpart of {@link normalizeDateRange}. */
export function normalizeAmountRange(value: unknown): AmountRange {
  const [rawNum1, rawNum2] = readBounds(value);
  const isBound = (bound: unknown): bound is number =>
    typeof bound === 'number';

  const num1 = isBound(rawNum1) ? rawNum1 : isBound(rawNum2) ? rawNum2 : 0;

  return { num1, num2: isBound(rawNum2) ? rawNum2 : num1 };
}

type ConditionLike = {
  field?: keyof FieldValueTypes;
  type?: string;
  op?: string;
  value?: unknown;
};

/** The `{ num1, num2 }` pair an `isbetween` condition should be holding. */
export function rangeForCondition(
  cond: ConditionLike,
): DateRange | AmountRange {
  // `type` is optional on a persisted condition, so fall back to the field
  const type = cond.type ?? (cond.field && FIELD_TYPES.get(cond.field));

  return type === 'date'
    ? normalizeDateRange(cond.value)
    : normalizeAmountRange(cond.value);
}

/**
 * Fill in an `isbetween` condition's bounds. Persisted conditions aren't
 * shape-validated, so the value can be a scalar or half a range — normalizing
 * on the way into an editor keeps what is displayed the same as what is saved.
 */
export function normalizeConditionRange<T extends ConditionLike>(cond: T) {
  if (cond.op !== 'isbetween') {
    return cond;
  }

  return { ...cond, value: rangeForCondition(cond) };
}
