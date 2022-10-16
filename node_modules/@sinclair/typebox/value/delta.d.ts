export declare type Edit<T = unknown> = Insert<T> | Update<T> | Delete<T>;
export interface Insert<T> {
    brand: T;
    type: 'insert';
    path: string;
    value: any;
}
export interface Update<T> {
    brand: T;
    type: 'update';
    path: string;
    value: any;
}
export interface Delete<T> {
    brand: T;
    type: 'delete';
    path: string;
}
export declare namespace ValueDelta {
    function Diff<T>(current: T, next: T): Edit<T>[];
    function Patch<T>(current: T, edits: Edit<T>[]): T;
}
