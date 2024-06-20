export declare function getUploadError({ reason, meta, }: {
    reason: string;
    meta?: unknown;
}): string;
export declare function getDownloadError({ reason, meta, fileName }: {
    reason: any;
    meta: any;
    fileName: any;
}): string;
export declare function getCreateKeyError(error: any): string;
export declare function getTestKeyError({ reason }: {
    reason: any;
}): string;
export declare function getSyncError(error: any, id: any): string;
export declare function getBankSyncError(error: {
    message?: string;
}): string;
export declare class LazyLoadFailedError extends Error {
    type: string;
    meta: {};
    constructor(name: string);
}
