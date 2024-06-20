/// <reference types="node" />
export declare function sha256String(str: any): Promise<string>;
export declare function randomBytes(n: any): Buffer;
export declare function encrypt(masterKey: any, value: any): Promise<{
    value: ArrayBuffer;
    meta: {
        keyId: any;
        algorithm: string;
        iv: string;
        authTag: string;
    };
}>;
export declare function decrypt(masterKey: any, encrypted: any, meta: any): Promise<Buffer>;
export declare function createKey({ secret, salt }: {
    secret: any;
    salt: any;
}): Promise<{
    raw: CryptoKey;
    base64: string;
}>;
export declare function importKey(str: any): Promise<{
    raw: CryptoKey;
    base64: any;
}>;
