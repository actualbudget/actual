import { Timestamp } from '@actual-app/crdt';
export { makeTestMessage } from './make-test-message';
export { resetSync } from './reset';
export { repairSync } from './repair';
type SyncingMode = 'enabled' | 'offline' | 'disabled' | 'import';
export declare function setSyncingMode(mode: SyncingMode): string;
export declare function checkSyncingMode(mode: SyncingMode): boolean;
export declare function serializeValue(value: string | number | null): string;
export declare function deserializeValue(value: string): string | number | null;
type DataMap = Map<string, unknown>;
type SyncListener = (oldData: DataMap, newData: DataMap) => unknown;
export declare function addSyncListener(func: SyncListener): () => void;
export type Message = {
    column: string;
    dataset: string;
    old?: unknown;
    row: string;
    timestamp: Timestamp;
    value: string | number | null;
};
export declare const applyMessages: (messages: Message[]) => Promise<Message[]>;
export declare function receiveMessages(messages: Message[]): Promise<Message[]>;
export declare function batchMessages(func: () => Promise<void>): Promise<void>;
export declare function sendMessages(messages: Message[]): Promise<void>;
export declare function getMessagesSince(since: string): Message[];
export declare function clearFullSyncTimeout(): void;
export declare function scheduleFullSync(): Promise<{
    messages: Message[];
} | {
    error: unknown;
}>;
export declare function initialFullSync(): Promise<{
    error?: {
        message: string;
        reason: string;
        meta: unknown;
    };
}>;
export declare const fullSync: () => Promise<{
    messages: Message[];
} | {
    error: {
        message: string;
        reason: string;
        meta: unknown;
    };
}>;
