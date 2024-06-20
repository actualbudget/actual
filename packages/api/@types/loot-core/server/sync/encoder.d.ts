import { Timestamp } from '@actual-app/crdt';
import { Message } from './index';
export declare function encode(groupId: string, fileId: string, since: Timestamp | string, messages: Message[]): Promise<Uint8Array>;
export declare function decode(data: Uint8Array): Promise<{
    messages: Message[];
    merkle: {
        hash: number;
    };
}>;
