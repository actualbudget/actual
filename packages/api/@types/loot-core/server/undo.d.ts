import { type HandlerFunctions } from '../types/handlers';
import { Message } from './sync';
export type UndoState = {
    messages: Message[];
    meta?: unknown;
    tables: string[];
    undoTag: string;
};
export declare function appendMessages(messages: any, oldData: any): void;
export declare function clearUndo(): void;
export declare function withUndo<T>(func: () => Promise<T>, meta?: unknown): Promise<T>;
export declare function undoable<T extends HandlerFunctions>(func: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
export declare function undo(): Promise<void>;
export declare function redo(): Promise<void>;
