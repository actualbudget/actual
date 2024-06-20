export declare function parseDateString(str: any): {
    type: string;
    date: string;
};
export declare class Condition {
    field: any;
    op: any;
    options: any;
    rawValue: any;
    type: any;
    unparsedValue: any;
    value: any;
    constructor(op: any, field: any, value: any, options: any, fieldTypes: any);
    eval(object: any): any;
    getValue(): any;
    serialize(): {
        options: any;
        op: any;
        field: any;
        value: any;
        type: any;
    };
}
declare const ACTION_OPS: readonly ["set", "set-split-amount", "link-schedule"];
type ActionOperator = (typeof ACTION_OPS)[number];
export declare class Action {
    field: any;
    op: ActionOperator;
    options: any;
    rawValue: any;
    type: any;
    value: any;
    constructor(op: ActionOperator, field: any, value: any, options: any, fieldTypes: any);
    exec(object: any): void;
    serialize(): {
        options: any;
        op: "set" | "set-split-amount" | "link-schedule";
        field: any;
        value: any;
        type: any;
    };
}
export declare function execActions(actions: Action[], transaction: any): any;
export declare class Rule {
    actions: any;
    conditions: any;
    conditionsOp: any;
    id: any;
    stage: any;
    constructor({ id, stage, conditionsOp, conditions, actions, fieldTypes, }: {
        id?: string;
        stage?: any;
        conditionsOp: any;
        conditions: any;
        actions: any;
        fieldTypes: any;
    });
    evalConditions(object: any): any;
    execActions<T>(object: T): Partial<T>;
    exec(object: any): Partial<any>;
    apply(object: any): any;
    getId(): any;
    serialize(): {
        id: any;
        stage: any;
        conditionsOp: any;
        conditions: any;
        actions: any;
    };
}
export declare class RuleIndexer {
    field: any;
    method: any;
    rules: any;
    constructor({ field, method }: {
        field: string;
        method?: string;
    });
    getIndex(key: any): any;
    getIndexForValue(value: any): any;
    getKey(value: any): string;
    getIndexes(rule: any): any[];
    index(rule: any): void;
    remove(rule: any): void;
    getApplicableRules(object: any): Set<unknown>;
}
export declare function rankRules(rules: any): any[];
export declare function migrateIds(rule: any, mappings: any): void;
export declare function iterateIds(rules: any, fieldName: any, func: any): void;
export {};
