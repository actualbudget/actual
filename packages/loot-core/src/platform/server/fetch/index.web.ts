import * as connection from '../connection';

export const fetch = async (
  input: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> => {
  const response = await globalThis.fetch(input, options);

  const originalHost = new URL(input instanceof Request ? input.url : input)
    .host;

  if (response.redirected && new URL(response.url).host !== originalHost) {
    connection.send('api-fetch-redirected');
  }

  return response;
};
