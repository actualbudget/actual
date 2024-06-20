/// <reference types="node" />
export declare function makeTestMessage(keyId: any): Promise<{
    value: Buffer;
    meta: {
        keyId: any;
        algorithm: "aes-256-gcm";
        iv: string;
        authTag: string;
    };
}>;
