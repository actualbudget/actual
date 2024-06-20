import { FiltersHandlers } from './types/handlers';
export declare const app: {
    events: any;
    handlers: FiltersHandlers;
    services: any;
    unlistenServices: any;
    method<Name extends "filter-create" | "filter-update" | "filter-delete">(name: Name, func: FiltersHandlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
};
