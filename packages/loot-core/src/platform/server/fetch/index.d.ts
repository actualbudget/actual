export function fetch(
  input: RequestInfo | URL,
  options?: unknown,
): Promise<Response>;
export function fetchBinary(
  input: RequestInfo | URL,
  filepath: string,
): Promise<unknown>;
