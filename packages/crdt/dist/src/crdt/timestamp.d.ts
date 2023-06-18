export declare function setClock(clock_: any): void;
export declare function getClock(): any;
export declare function makeClock(timestamp: any, merkle?: {}): {
    timestamp: any;
    merkle: {};
};
export declare function serializeClock(clock: any): string;
export declare function deserializeClock(clock: any): {
    timestamp: any;
    merkle: any;
};
export declare function makeClientId(): any;
/**
 * timestamp instance class
 */
export declare class Timestamp {
    static init: any;
    static max: any;
    static parse: any;
    static recv: any;
    static send: any;
    static since: any;
    static zero: any;
    static ClockDriftError: any;
    static DuplicateNodeError: any;
    static OverflowError: any;
    _state: any;
    constructor(millis: number, counter: number, node: string);
    valueOf(): string;
    toString(): string;
    millis(): any;
    counter(): any;
    node(): any;
    hash(): any;
}
