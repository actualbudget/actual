export type EmptyObject = Record<never, never>;

export type StripNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

export type FunctionParameters<F extends Function> = F extends (
  ...args: infer A
) => any
  ? A
  : never;

export type FunctionReturnType<T> = T extends (...args: any[]) => infer R
  ? R
  : any;
