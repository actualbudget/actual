import { type ScheduleEntity } from './schedule';

export interface RuleEntity {
  id?: string;
  stage: string;
  conditionsOp: 'any' | 'and';
  conditions: RuleConditionEntity[];
  actions: RuleActionEntity[];
  tombstone?: boolean;
}

export interface RuleConditionEntity {
  field: unknown;
  op:
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
    | 'doesNotContain';
  value: unknown;
  options?: unknown;
  conditionsOp?: unknown;
  type?: string;
  customName?: string;
}

export type RuleActionEntity =
  | SetRuleActionEntity
  | LinkScheduleRuleActionEntity
  | NoOpRuleActionEntity;

export interface SetRuleActionEntity {
  field: string;
  op: 'set';
  value: unknown;
  options?: {
    splitIndex?: number;
  };
  type?: string;
}

export interface LinkScheduleRuleActionEntity {
  op: 'link-schedule';
  value: ScheduleEntity;
}

export interface NoOpRuleActionEntity {
  op: 'no-op';
  options: {
    splitIndex: number;
  };
}
