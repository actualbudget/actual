export type Node = {
    name: string;
    expr: string | number | boolean;
    value: string | number | boolean;
    sheet: unknown;
    query?: string;
    sql?: {
        sqlPieces: unknown;
        state: {
            dependencies: unknown[];
        };
    };
    dynamic?: boolean;
    _run?: unknown;
    _dependencies?: string[];
};
export declare class Spreadsheet {
    _meta: any;
    cacheBarrier: any;
    computeQueue: any;
    dirtyCells: any;
    events: any;
    graph: any;
    nodes: Map<string, Node>;
    running: any;
    saveCache: any;
    setCacheStatus: any;
    transactionDepth: any;
    constructor(saveCache?: unknown, setCacheStatus?: unknown);
    meta(): any;
    setMeta(meta: any): void;
    _getNode(name: string): Node;
    getNode(name: any): Node;
    hasCell(name: any): boolean;
    add(name: any, expr: any): void;
    getNodes(): Map<string, Node>;
    serialize(): {
        graph: any;
        nodes: [string, Node][];
    };
    transaction(func: any): any[];
    startTransaction(): void;
    endTransaction(): any[];
    queueComputation(cellNames: any): void;
    runComputations(idx?: number): void;
    markCacheSafe(): void;
    markCacheDirty(): void;
    startCacheBarrier(): void;
    endCacheBarrier(): void;
    addEventListener(name: any, func: any): () => any;
    onFinish(func: any): () => any;
    unload(): void;
    getValue(name: any): string | number | boolean;
    getExpr(name: any): string | number | boolean;
    getCellValue(sheet: any, name: any): string | number | boolean;
    getCellExpr(sheet: any, name: any): string | number | boolean;
    getCellValueLoose(sheetName: any, cellName: any): string | number | boolean;
    bootup(onReady: any): void;
    load(name: string, value: string | number | boolean): void;
    create(name: string, value: string | number | boolean): any[];
    set(name: string, value: string | number | boolean): void;
    recompute(name: string): void;
    recomputeAll(): void;
    createQuery(sheetName: string, cellName: string, query: string): void;
    createStatic(sheetName: string, cellName: string, initialValue: number | boolean): void;
    createDynamic(sheetName: string, cellName: string, { dependencies, run, initialValue, refresh, }: {
        dependencies?: string[];
        run?: unknown;
        initialValue: number | boolean;
        refresh?: boolean;
    }): void;
    clearSheet(sheetName: string): void;
    voidCell(sheetName: string, name: string, voidValue?: any): void;
    deleteCell(sheetName: string, name: string): void;
    addDependencies(sheetName: string, cellName: string, deps: string[]): void;
    removeDependencies(sheetName: string, cellName: string, deps: string[]): void;
    _markDirty(name: any): void;
    triggerDatabaseChanges(oldValues: any, newValues: any): void;
}
