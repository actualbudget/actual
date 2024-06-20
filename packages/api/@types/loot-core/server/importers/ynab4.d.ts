/// <reference types="node" />
import { YNAB4 } from './ynab4-types';
export declare function doImport(data: YNAB4.YFull): Promise<void>;
export declare function getBudgetName(filepath: any): string;
export declare function parseFile(buffer: Buffer): YNAB4.YFull;
