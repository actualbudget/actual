declare class App<Handlers> {
    events: any;
    handlers: Handlers;
    services: any;
    unlistenServices: any;
    constructor();
    method<Name extends string & keyof Handlers>(name: Name, func: Handlers[Name]): void;
    service(func: any): void;
    combine(...apps: any[]): void;
    startServices(): void;
    stopServices(): void;
}
export declare function createApp<T>(): App<T>;
export {};
