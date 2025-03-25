import * as connection from '../connection';

export const fetch = async (
  input: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> => {
  const response = await globalThis.fetch(input, options);

  // Detect if the API query has been redirected to a different origin. This may indicate that the
  // request has been intercepted by an authentication proxy
  const originalUrl = new URL(input instanceof Request ? input.url : input);
  const responseUrl = new URL(response.url);
  if (response.redirected && responseUrl.host !== originalUrl.host) {
    connection.send('api-fetch-redirected');
    throw new Error(`API request redirected to ${responseUrl.host}`);
  }

  return response;
};
