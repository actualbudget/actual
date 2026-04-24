export type BrandedId<T extends string> = string & { __brand: T };
