/// <reference types="node" />
export interface RemoteFile {
    deleted: boolean;
    fileId: string;
    groupId: string;
    name: string;
    encryptKeyId: string;
    hasKey: boolean;
}
export declare function checkKey(): Promise<{
    valid: boolean;
    error?: {
        reason: string;
    };
}>;
export declare function resetSyncState(newKeyState: any): Promise<{
    error: {
        reason: string;
    };
} | {
    error?: undefined;
}>;
export declare function exportBuffer(): Promise<Buffer>;
export declare function importBuffer(fileData: any, buffer: any): Promise<{
    id: any;
}>;
export declare function upload(): Promise<void>;
export declare function possiblyUpload(): Promise<void>;
export declare function removeFile(fileId: any): Promise<void>;
export declare function listRemoteFiles(): Promise<RemoteFile[] | null>;
export declare function download(fileId: any): Promise<{
    id: any;
}>;
