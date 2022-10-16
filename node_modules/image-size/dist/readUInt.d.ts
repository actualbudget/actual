/// <reference types="node" />
declare type Bits = 16 | 32;
export declare function readUInt(buffer: Buffer, bits: Bits, offset: number, isBigEndian: boolean): number;
export {};
