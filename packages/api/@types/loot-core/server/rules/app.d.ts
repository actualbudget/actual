import { RulesHandlers } from './types/handlers';
export declare const app: {
    events: any;
    handlers: RulesHandlers;
    services: any;
    unlistenServices: any;
    method<Name extends "rule-validate" | "rule-add" | "rule-update" | "rule-delete" | "rule-delete-all" | "rule-apply-actions" | "rule-add-payee-rename" | "rules-get" | "rule-get" | "rules-run">(name: Name, func: RulesHandlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
};
