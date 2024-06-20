import { Notification } from '../../client/state-types/notifications';
export declare function applyTemplate({ month }: {
    month: any;
}): Promise<Notification>;
export declare function overwriteTemplate({ month }: {
    month: any;
}): Promise<Notification>;
export declare function applySingleCategoryTemplate({ month, category }: {
    month: any;
    category: any;
}): Promise<Notification>;
export declare function runCheckTemplates(): Promise<Notification>;
