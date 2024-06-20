import type { InitConfig } from './loot-core/server/main';
export declare const internal: any;
export * as methods from './methods';
export * from './methods';
export * as utils from './utils';
export declare function init(config?: InitConfig): Promise<any>;
export declare function shutdown(): Promise<void>;
