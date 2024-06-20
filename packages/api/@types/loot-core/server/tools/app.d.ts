import { ToolsHandlers } from './types/handlers';
export declare const app: {
    events: any;
    handlers: ToolsHandlers;
    services: any;
    unlistenServices: any;
    method<Name extends "tools/fix-split-transactions">(name: Name, func: ToolsHandlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
};
