export type OAuthClient = {
  clientId: string;
  name: string;
  clientSecret?: string;
  logoUri?: string;
  redirectUris: string[];
};

export function validateOAuthClients(
  clients: unknown,
): asserts clients is OAuthClient[] {
  if (!Array.isArray(clients)) {
    throw new Error('OAuth clients must be an array');
  }
  const ids = new Set<string>();
  for (const client of clients) {
    if (
      !client ||
      typeof client.clientId !== 'string' ||
      !client.clientId ||
      typeof client.name !== 'string' ||
      !client.name.trim() ||
      (client.clientSecret !== undefined &&
        (typeof client.clientSecret !== 'string' || !client.clientSecret)) ||
      !Array.isArray(client.redirectUris) ||
      client.redirectUris.length === 0 ||
      ids.has(client.clientId)
    ) {
      throw new Error(
        'OAuth clients require a unique clientId, name and redirectUris; clientSecret must be a non-empty string when provided',
      );
    }
    if (client.logoUri !== undefined) {
      if (typeof client.logoUri !== 'string' || !client.logoUri) {
        throw new Error('OAuth client logoUri must be an HTTPS URL');
      }
      const logo = new URL(client.logoUri);
      if (logo.protocol !== 'https:' || logo.username || logo.password) {
        throw new Error(
          'OAuth client logoUri must be an HTTPS URL without credentials',
        );
      }
    }
    ids.add(client.clientId);
    for (const uri of client.redirectUris) {
      if (typeof uri !== 'string') {
        throw new Error('Invalid OAuth redirect URI');
      }
      const url = new URL(uri);
      if (
        url.username ||
        url.password ||
        url.hash ||
        (url.protocol !== 'https:' &&
          !(
            url.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
          ))
      ) {
        throw new Error(
          'OAuth redirect URIs require HTTPS (or HTTP on loopback) without credentials or fragments',
        );
      }
    }
  }
}
