// @ts-strict-ignore
import { type Action } from '..';
import {
  type RuleEntity,
  type TransactionEntity,
  type RuleActionEntity,
} from '../../../types/models';

type ValidationError = {
  conditionErrors: string[];
  actionErrors: string[];
};

export interface RulesHandlers {
  'rule-validate': (
    rule: Partial<RuleEntity>,
  ) => Promise<{ error: ValidationError | null }>;

  'rule-add': (
    rule: Omit<RuleEntity, 'id'>,
  ) => Promise<{ error: ValidationError } | RuleEntity>;

  'rule-update': <
    PartialRule extends Partial<Omit<RuleEntity, 'id'>> &
      Pick<RuleEntity, 'id'>,
  >(
    rule: PartialRule,
  ) => Promise<{ error: ValidationError } | PartialRule>;

  'rule-delete': (id: string) => Promise<boolean>;

  'rule-delete-all': (
    ids: string[],
  ) => Promise<{ someDeletionsFailed: boolean }>;

  'rule-apply-actions': (arg: {
    transactions: TransactionEntity[];
    actions: Array<Action | RuleActionEntity>;
  }) => Promise<null | { added: TransactionEntity[]; updated: unknown[] }>;

  'rule-add-payee-rename': (arg: {
    fromNames: string[];
    to: string;
  }) => Promise<string>;

  'rules-get': () => Promise<RuleEntity[]>;

  'rule-get': (arg: { id: RuleEntity['id'] }) => Promise<RuleEntity>;

  'rules-run': (arg: {
    transaction: TransactionEntity;
  }) => Promise<TransactionEntity>;
}
