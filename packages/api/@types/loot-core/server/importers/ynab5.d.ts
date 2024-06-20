/// <reference types="node" />
import { YNAB5 } from './ynab5-types';
export declare function doImport(data: YNAB5.Budget): Promise<void>;
export declare function parseFile(buffer: Buffer): YNAB5.Budget;
export declare function getBudgetName(_filepath: string, data: YNAB5.Budget): string;
