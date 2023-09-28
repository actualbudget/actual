export type EmptyObject = Record<never, never>;

export type StripNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};
