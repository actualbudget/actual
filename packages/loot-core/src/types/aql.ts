export type AqlQueryColumn = {
  name: string;
  type: string;
};

export type AqlErrorDetail = {
  type: 'compile-error' | 'runtime-error' | 'executor-error';
  message: string;
};

export type AqlQueryResult = {
  // oxlint-disable-next-line typescript/no-explicit-any
  data: any;
  dependencies: string[];
  columns?: AqlQueryColumn[];
  error?: AqlErrorDetail;
};
