import { type HandlerFunctions, type Handlers } from '../types/handlers';
export declare function mutator<T extends HandlerFunctions>(handler: T): T;
export declare function isMutating(handler: any): boolean;
export declare function runHandler<T extends Handlers[keyof Handlers]>(handler: T, args?: Parameters<T>[0], { undoTag, name }?: {
    undoTag?: any;
    name?: any;
}): Promise<ReturnType<T>>;
export declare function enableGlobalMutations(): void;
export declare function disableGlobalMutations(): void;
declare function _runMutator<T extends () => Promise<unknown>>(func: T, initialContext?: {}): Promise<Awaited<ReturnType<T>>>;
export declare const runMutator: typeof _runMutator;
export declare function withMutatorContext<T>(context: {
    undoListening: boolean;
    undoTag?: unknown;
}, func: () => Promise<T>): Promise<T>;
export declare function getMutatorContext(): any;
export {};
