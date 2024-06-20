import { Rule } from '../accounts/rules';
import { SchedulesHandlers } from './types/handlers';
export declare function updateConditions(conditions: any, newConditions: any): any;
export declare function getNextDate(dateCond: any, start?: Date, noSkipWeekend?: boolean): any;
export declare function getRuleForSchedule(id: string | null): Promise<Rule>;
export declare function setNextDate({ id, start, conditions, reset, }: {
    id: string;
    start?: any;
    conditions?: any;
    reset?: boolean;
}): Promise<void>;
export declare function createSchedule({ schedule, conditions, }?: {
    schedule?: any;
    conditions?: any[];
}): Promise<any>;
export declare function updateSchedule({ schedule, conditions, resetNextDate, }: {
    schedule: any;
    conditions?: any;
    resetNextDate?: boolean;
}): Promise<void>;
export declare function deleteSchedule({ id }: {
    id: any;
}): Promise<void>;
export declare const app: {
    events: any;
    handlers: SchedulesHandlers;
    services: any;
    unlistenServices: any;
    method<Name extends "schedule/create" | "schedule/update" | "schedule/delete" | "schedule/skip-next-date" | "schedule/post-transaction" | "schedule/force-run-service" | "schedule/discover" | "schedule/get-upcoming-dates">(name: Name, func: SchedulesHandlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
};
export declare function getDateWithSkippedWeekend(date: Date, solveMode: 'after' | 'before'): Date;
