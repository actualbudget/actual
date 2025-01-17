import { type RecurConfig, type ScheduleEntity } from './schedule';

export interface NewRuleEntity {
  stage: 'pre' | null | 'post';
  conditionsOp: 'or' | 'and';
  conditions: RuleConditionEntity[];
  actions: RuleActionEntity[];
  tombstone?: boolean;
}

export interface RuleEntity extends NewRuleEntity {
  id: string;
}

export type RuleConditionOp =
  | 'is'
  | 'isNot'
  | 'oneOf'
  | 'notOneOf'
  | 'isapprox'
  | 'isbetween'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'doesNotContain'
  | 'hasTags'
  | 'and'
  | 'matches'
  | 'onBudget'
  | 'offBudget';

export type FieldValueTypes = {
  account: string;
  amount: number;
  category: string;
  date: string | RecurConfig;
  notes: string;
  payee: string;
  payee_name: string;
  imported_payee: string;
  saved: string;
  transfer: boolean;
  parent: boolean;
  cleared: boolean;
  reconciled: boolean;
};

type BaseConditionEntity<
  Field extends keyof FieldValueTypes,
  Op extends RuleConditionOp,
> = {
  field: Field;
  op: Op;
  value: Op extends 'oneOf' | 'notOneOf'
    ? Array<FieldValueTypes[Field]>
    : Op extends 'isbetween'
      ? { num1: number; num2: number }
      : FieldValueTypes[Field];
  options?: {
    inflow?: boolean;
    outflow?: boolean;
    month?: boolean;
    year?: boolean;
  };
  conditionsOp?: string;
  type?: 'id' | 'boolean' | 'date' | 'number' | 'string';
  customName?: string;
  queryFilter?: Record<string, { $oneof: string[] }>;
};

export type RuleConditionEntity =
  | BaseConditionEntity<
      'account',
      | 'is'
      | 'isNot'
      | 'oneOf'
      | 'notOneOf'
      | 'contains'
      | 'doesNotContain'
      | 'matches'
      | 'onBudget'
      | 'offBudget'
    >
  | BaseConditionEntity<
      'category',
      | 'is'
      | 'isNot'
      | 'oneOf'
      | 'notOneOf'
      | 'contains'
      | 'doesNotContain'
      | 'matches'
    >
  | BaseConditionEntity<
      'amount',
      'is' | 'isapprox' | 'isbetween' | 'gt' | 'gte' | 'lt' | 'lte'
    >
  | BaseConditionEntity<
      'date',
      'is' | 'isapprox' | 'isbetween' | 'gt' | 'gte' | 'lt' | 'lte'
    >
  | BaseConditionEntity<
      'notes',
      | 'is'
      | 'isNot'
      | 'oneOf'
      | 'notOneOf'
      | 'contains'
      | 'doesNotContain'
      | 'matches'
      | 'hasTags'
    >
  | BaseConditionEntity<
      'payee',
      | 'is'
      | 'isNot'
      | 'oneOf'
      | 'notOneOf'
      | 'contains'
      | 'doesNotContain'
      | 'matches'
    >
  | BaseConditionEntity<
      'imported_payee',
      | 'is'
      | 'isNot'
      | 'oneOf'
      | 'notOneOf'
      | 'contains'
      | 'doesNotContain'
      | 'matches'
    >
  | BaseConditionEntity<'saved', 'is'>
  | BaseConditionEntity<'cleared', 'is'>
  | BaseConditionEntity<'reconciled', 'is'>;

export type RuleActionEntity =
  | SetRuleActionEntity
  | SetSplitAmountRuleActionEntity
  | LinkScheduleRuleActionEntity
  | PrependNoteRuleActionEntity
  | AppendNoteRuleActionEntity;

export interface SetRuleActionEntity {
  field: string;
  op: 'set';
  value: unknown;
  options?: {
    template?: string;
    splitIndex?: number;
  };
  type?: string;
}

export interface SetSplitAmountRuleActionEntity {
  op: 'set-split-amount';
  value: number;
  options?: {
    splitIndex?: number;
    method: 'fixed-amount' | 'fixed-percent' | 'remainder';
  };
}

export interface LinkScheduleRuleActionEntity {
  op: 'link-schedule';
  value: ScheduleEntity;
}

export interface PrependNoteRuleActionEntity {
  op: 'prepend-notes';
  value: string;
}

export interface AppendNoteRuleActionEntity {
  op: 'append-notes';
  value: string;
}
