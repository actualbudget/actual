/**
 * Utility types for plugins-core
 */

export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
