import { ReportsHandlers } from './types/handlers';
export declare const app: {
    events: any;
    handlers: ReportsHandlers;
    services: any;
    unlistenServices: any;
    method<Name extends "report/create" | "report/update" | "report/delete">(name: Name, func: ReportsHandlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
};
