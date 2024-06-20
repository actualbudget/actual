import type { LocalPrefs } from '../types/prefs';
export declare const BUDGET_TYPES: readonly ["report", "rollover"];
export type BudgetType = (typeof BUDGET_TYPES)[number];
export declare function loadPrefs(id?: string): Promise<LocalPrefs>;
export declare function savePrefs(prefsToSet: LocalPrefs, { avoidSync }?: {
    avoidSync?: boolean;
}): Promise<void>;
export declare function unloadPrefs(): void;
export declare function getPrefs(): LocalPrefs;
export declare function getDefaultPrefs(id: string, budgetName: string): LocalPrefs;
