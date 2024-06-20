import { type RuleEntity, type TransactionEntity, type RuleActionEntity } from '../../../types/models';
import { type Action } from '../../accounts/rules';
type ValidationError = {
    conditionErrors: string[];
    actionErrors: string[];
};
export interface RulesHandlers {
    'rule-validate': (rule: Partial<RuleEntity>) => Promise<{
        error: ValidationError | null;
    }>;
    'rule-add': (rule: Omit<RuleEntity, 'id'>) => Promise<{
        error: ValidationError;
    } | {
        id: string;
    }>;
    'rule-update': (rule: Partial<RuleEntity>) => Promise<{
        error: ValidationError;
    } | object>;
    'rule-delete': (rule: Required<RuleEntity>) => Promise<false | void>;
    'rule-delete-all': (ids: string[]) => Promise<{
        someDeletionsFailed: boolean;
    }>;
    'rule-apply-actions': (arg: {
        transactions: TransactionEntity[];
        actions: Array<Action | RuleActionEntity>;
    }) => Promise<null | {
        added: TransactionEntity[];
        updated: unknown[];
    }>;
    'rule-add-payee-rename': (arg: {
        fromNames: string[];
        to: string;
    }) => Promise<string>;
    'rules-get': () => Promise<RuleEntity[]>;
    'rule-get': (arg: {
        id: string;
    }) => Promise<unknown>;
    'rules-run': (arg: {
        transaction: any;
    }) => Promise<unknown>;
}
export {};
