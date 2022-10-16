export interface ServiceType {
    name?: string;
    protocol?: 'tcp' | 'udp' | string | null | undefined;
    subtypes?: Array<string>;
}
export declare const toString: (data: ServiceType) => any;
export declare const toType: (string: string) => ServiceType;
