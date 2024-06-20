import './polyfills';
import * as fs from '../platform/server/fs';
import { q } from '../shared/query';
import { Handlers } from '../types/handlers';
import * as db from './db';
export declare let handlers: Handlers;
export declare function initApp(isDev: any, socketName: any): Promise<void>;
export type InitConfig = {
    dataDir?: string;
    serverURL?: string;
    password?: string;
};
export declare function init(config: InitConfig): Promise<{
    getDataDir: typeof fs.getDataDir;
    sendMessage: (msg: any, args: any) => void;
    send: <K extends keyof Handlers, T extends Handlers[K]>(name: K, args?: Parameters<T>[0]) => Promise<Awaited<ReturnType<T>>>;
    on: (name: any, func: any) => any;
    q: typeof q;
    db: typeof db;
}>;
export declare const lib: {
    getDataDir: typeof fs.getDataDir;
    sendMessage: (msg: any, args: any) => void;
    send: <K extends keyof Handlers, T extends Handlers[K]>(name: K, args?: Parameters<T>[0]) => Promise<Awaited<ReturnType<T>>>;
    on: (name: any, func: any) => any;
    q: typeof q;
    db: typeof db;
};
