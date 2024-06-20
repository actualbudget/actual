import { type TransactionEntity, type RuleActionEntity, type RuleEntity } from '../../types/models';
import { Action } from './rules';
export { iterateIds } from './rules';
export declare function resetState(): void;
export declare function parseConditionsOrActions(str: any): any[];
export declare function serializeConditionsOrActions(arr: any): string;
export declare const ruleModel: {
    validate(rule: any, { update }?: {
        update?: boolean;
    }): any;
    toJS(row: any): any;
    fromJS(rule: any): any;
};
export declare function makeRule(data: any): any;
export declare function loadRules(): Promise<void>;
export declare function getRules(): any[];
export declare function insertRule(rule: Omit<RuleEntity, 'id'> & {
    id?: string;
}): Promise<any>;
export declare function updateRule(rule: any): Promise<void>;
export declare function deleteRule<T extends {
    id: string;
}>(rule: T): Promise<false | void>;
export declare function runRules(trans: any): any;
export declare function conditionsToAQL(conditions: any, { recurDateBounds }?: {
    recurDateBounds?: number;
}): {
    filters: any;
    errors: any[];
};
export declare function applyActions(transactions: TransactionEntity[], actions: Array<Action | RuleActionEntity>): Promise<{
    added: TransactionEntity[];
    updated: TransactionEntity[] | ({
        id: any;
        transfer_id: any;
    } | {
        id: any;
        payee: any;
    } | {
        id: any;
        category: any;
    })[];
}>;
export declare function getRulesForPayee(payeeId: any): any[];
export declare function updatePayeeRenameRule(fromNames: string[], to: string): Promise<any>;
export declare function getProbableCategory(transactions: any): any;
export declare function updateCategoryRules(transactions: any): Promise<void>;
