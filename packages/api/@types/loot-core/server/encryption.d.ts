/// <reference types="node" />
declare class Key {
    id: any;
    value: any;
    constructor({ id }: {
        id: any;
    });
    createFromPassword({ password, salt }: {
        password: any;
        salt: any;
    }): Promise<void>;
    createFromBase64(str: any): Promise<void>;
    getId(): any;
    getValue(): any;
    serialize(): {
        id: any;
        base64: any;
    };
}
export declare function getKey(keyId: any): any;
export declare function hasKey(keyId: any): boolean;
export declare function encrypt(value: any, keyId: any): {
    value: Buffer;
    meta: {
        keyId: any;
        algorithm: "aes-256-gcm";
        iv: string;
        authTag: string;
    };
};
export declare function decrypt(encrypted: any, meta: any): Buffer;
export declare function randomBytes(n: any): Buffer;
export declare function loadKey(key: any): Promise<void>;
export declare function unloadKey(key: any): void;
export declare function unloadAllKeys(): void;
export declare function createKey({ id, password, salt }: {
    id: any;
    password: any;
    salt: any;
}): Promise<Key>;
export {};
