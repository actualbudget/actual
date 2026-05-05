import { v4 as uuidv4 } from 'uuid';

type GlobalCrypto = typeof globalThis & {
    crypto?: Crypto & {
        randomUUID?: (() => string) | undefined;
    };
};

export function generateUUID() {
    return uuidv4();
}

export function polyfillRandomUUID() {
    const globalObject = globalThis as GlobalCrypto;
    const cryptoObject = globalObject.crypto;

    if (!cryptoObject || typeof cryptoObject.randomUUID === 'function') {
        return;
    }

    Object.defineProperty(cryptoObject, 'randomUUID', {
        value: generateUUID,
        configurable: true,
    });
}