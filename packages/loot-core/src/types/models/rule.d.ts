import { type ScheduleEntity } from './schedule';

export interface NewRuleEntity {
  stage: string;
  conditionsOp: 'any' | 'and';
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
  | 'matches';

export interface RuleConditionEntity {
  field?: string;
  op?: RuleConditionOp;
  value?: string | string[] | number | boolean;
  options?: {
    inflow?: boolean;
    outflow?: boolean;
    month?: boolean;
    year?: boolean;
  };
  conditionsOp?: string;
  type?: string;
  customName?: string;
}

export type RuleActionEntity =
  | SetRuleActionEntity
  | SetSplitAmountRuleActionEntity
  | LinkScheduleRuleActionEntity;

export interface SetRuleActionEntity {
  field: string;
  op: 'set';
  value: unknown;
  options?: {
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
