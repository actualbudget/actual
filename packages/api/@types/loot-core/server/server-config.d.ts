type ServerConfig = {
    BASE_SERVER: string;
    SYNC_SERVER: string;
    SIGNUP_SERVER: string;
    GOCARDLESS_SERVER: string;
    SIMPLEFIN_SERVER: string;
};
export declare function setServer(url: string): void;
export declare function getServer(url?: string): ServerConfig | null;
export {};
