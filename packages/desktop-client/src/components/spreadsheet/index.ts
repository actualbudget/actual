// @ts-strict-ignore
import { type Query } from 'loot-core/src/shared/query';

export type Binding = string | { name: string; value?; query?: Query };
