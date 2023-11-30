import { type ScheduleEntity } from './schedule';

export interface RuleEntity {
  id?: string;
  stage: string;
  conditionsOp: 'any' | 'and';
  conditions: RuleConditionEntity[];
  actions: RuleActionEntity[];
  tombstone?: boolean;
}

interface RuleConditionEntity {
  field: unknown;
  op:
    | is
    | isNot
    | oneOf
    | notOneOf
    | isapprox
    | isbetween
    | gt
    | gte
    | lt
    | lte
    | contains
    | doesNotContain;
  value: unknown;
  options?: unknown;
  conditionsOp?: unknown;
  type?: string;
}

export type RuleActionEntity =
  | SetRuleActionEntity
  | LinkScheduleRuleActionEntity;

export interface SetRuleActionEntity {
  field: string;
  op: 'set';
  value: unknown;
  options?: unknown;
  type?: string;
}

export interface LinkScheduleRuleActionEntity {
  op: 'link-schedule';
  value: ScheduleEntity;
}
