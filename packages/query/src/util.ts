/**
 * Utility Types
 */

export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
