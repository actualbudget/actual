import { type HandlerFunctions } from '../types/handlers';
export declare function sequential<T extends HandlerFunctions>(fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
export declare function once<T extends HandlerFunctions>(fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> | null;
