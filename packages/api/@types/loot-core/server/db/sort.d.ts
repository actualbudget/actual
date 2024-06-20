export declare const SORT_INCREMENT = 16384;
export declare function shoveSortOrders<T extends {
    id: string;
    sort_order: number;
}>(items: T[], targetId?: string): {
    updates: {
        id: string;
        sort_order: number;
    }[];
    sort_order: any;
};
