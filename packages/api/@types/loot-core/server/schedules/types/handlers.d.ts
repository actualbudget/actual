import { DiscoverScheduleEntity } from '../../../types/models';
export interface SchedulesHandlers {
    'schedule/create': (arg: {
        schedule: {
            id?: string;
            name?: string;
            posts_transaction?: boolean;
        };
        conditions: unknown[];
    }) => Promise<string>;
    'schedule/update': (schedule: {
        schedule: any;
        conditions?: any;
        resetNextDate?: boolean;
    }) => Promise<void>;
    'schedule/delete': (arg: {
        id: string;
    }) => Promise<void>;
    'schedule/skip-next-date': (arg: {
        id: string;
    }) => Promise<void>;
    'schedule/post-transaction': (arg: {
        id: string;
    }) => Promise<void>;
    'schedule/force-run-service': () => Promise<unknown>;
    'schedule/discover': () => Promise<DiscoverScheduleEntity[]>;
    'schedule/get-upcoming-dates': (arg: {
        config: any;
        count: number;
    }) => Promise<string[]>;
}
