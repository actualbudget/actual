import { NotesHandlers } from './types/handlers';
export declare const app: {
    events: any;
    handlers: NotesHandlers;
    services: any;
    unlistenServices: any;
    method<Name extends "notes-save">(name: Name, func: NotesHandlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
};
