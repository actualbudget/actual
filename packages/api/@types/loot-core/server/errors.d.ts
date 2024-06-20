export declare class PostError extends Error {
    meta?: {
        meta: string;
    };
    reason: string;
    type: 'PostError';
    constructor(reason: string, meta?: {
        meta: string;
    });
}
export declare class HTTPError extends Error {
    statusCode: number;
    responseBody: string;
    constructor(code: number, body: string);
}
export declare class SyncError extends Error {
    meta?: {
        isMissingKey: boolean;
    } | {
        error: {
            message: string;
            stack: string;
        };
        query: {
            sql: string;
            params: Array<string | number>;
        };
    };
    reason: string;
    constructor(reason: string, meta?: {
        isMissingKey: boolean;
    } | {
        error: {
            message: string;
            stack: string;
        };
        query: {
            sql: string;
            params: Array<string | number>;
        };
    });
}
export declare class TransactionError extends Error {
}
export declare class RuleError extends Error {
    type: string;
    constructor(name: string, message: string);
}
export declare function APIError(msg: string, meta?: Record<string, any>): {
    type: string;
    message: string;
    meta: Record<string, any>;
};
export declare function FileDownloadError(reason: string, meta?: {
    fileId?: string;
    isMissingKey?: boolean;
}): {
    type: string;
    reason: string;
    meta: {
        fileId?: string;
        isMissingKey?: boolean;
    };
};
export declare function FileUploadError(reason: string, meta?: {
    isMissingKey: boolean;
}): {
    type: string;
    reason: string;
    meta: {
        isMissingKey: boolean;
    };
};
