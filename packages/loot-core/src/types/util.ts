export type EmptyObject = Record<never, never>;

export type StripNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

export type EverythingButIdOptional<T extends { id: unknown }> = {
  id: T['id'];
} & Partial<Omit<T, 'id'>>;

export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Allows use of object literals inside child elements of `Trans` tags
// see https://github.com/i18next/react-i18next/issues/1483
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransObjectLiteral = any;

export type AtLeastOne<T extends Record<string, unknown>> =
  keyof T extends infer K
    ? K extends string
      ? Pick<T, K & keyof T> & Partial<T>
      : never
    : never;
