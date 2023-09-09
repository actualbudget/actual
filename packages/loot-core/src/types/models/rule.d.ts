import { type ScheduleEntity } from './schedule';

export interface RuleEntity {
  id: string;
  stage: string;
  conditions_op?: string;
  conditionsOp?: string; // TODO: this should not be here.. figure out howto remove it
  conditions: RuleConditionEntity[];
  actions: RuleActionEntity[];
  tombstone?: boolean;
}

interface RuleConditionEntity {
  field: unknown;
  op: unknown;
  value: unknown;
  options?: unknown;
  conditionsOp?: unknown;
}

export type RuleActionEntity =
  | SetRuleActionEntity
  | LinkScheduleRuleActionEntity;

export interface SetRuleActionEntity {
  field: string;
  op: 'set';
  value: unknown;
  options?: unknown;
}

export interface LinkScheduleRuleActionEntity {
  op: 'link-schedule';
  value: ScheduleEntity;
}
