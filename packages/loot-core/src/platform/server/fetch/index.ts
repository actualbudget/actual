import * as connection from '../connection';

export const fetch = async (
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> => {
  // Set redirect to manual so that we can detect and respond to redirects.
  if (!options.redirect) options.redirect = 'manual';

  const response = await globalThis.fetch(input, options);

  // Authentication proxies redirect when authentication has expired. In this case,
  // we want to fully reload and yeild control from the service worker back to the server.
  if (response.type === 'opaqueredirect') {
    connection.send('api-fetch-redirected');
    throw new Error(`API request redirected`);
  }

  return response;
};
