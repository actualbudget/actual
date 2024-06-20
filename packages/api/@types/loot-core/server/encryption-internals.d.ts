/// <reference types="node" />
export declare function sha256String(str: any): Promise<string>;
export declare function randomBytes(n: any): Buffer;
export declare function encrypt(masterKey: any, value: any): {
    value: Buffer;
    meta: {
        keyId: any;
        algorithm: "aes-256-gcm";
        iv: string;
        authTag: string;
    };
};
export declare function decrypt(masterKey: any, encrypted: any, meta: any): Buffer;
export declare function createKey({ secret, salt }: {
    secret: any;
    salt: any;
}): {
    raw: Buffer;
    base64: string;
};
export declare function importKey(str: any): {
    raw: Buffer;
    base64: any;
};
