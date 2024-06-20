import { BudgetHandlers } from './types/handlers';
export declare const app: {
    events: any;
    handlers: BudgetHandlers;
    services: any;
    unlistenServices: any;
    method<Name extends "budget/budget-amount" | "budget/copy-previous-month" | "budget/set-zero" | "budget/set-3month-avg" | "budget/check-templates" | "budget/apply-goal-template" | "budget/overwrite-goal-template" | "budget/cleanup-goal-template" | "budget/hold-for-next-month" | "budget/reset-hold" | "budget/cover-overspending" | "budget/transfer-available" | "budget/cover-overbudgeted" | "budget/transfer-category" | "budget/set-carryover" | "budget/apply-single-template" | "budget/set-n-month-avg" | "budget/copy-single-month">(name: Name, func: BudgetHandlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
};
