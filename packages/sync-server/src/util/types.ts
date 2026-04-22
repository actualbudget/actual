import type { UUID } from 'crypto';

export type BrandedId<T extends string> = UUID & { __brand: T };
