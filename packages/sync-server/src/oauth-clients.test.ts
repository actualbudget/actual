import { describe, expect, it } from 'vitest';

import { validateOAuthClients } from './oauth-clients';

describe('OAuth client registration', () => {
  const client = {
    clientId: 'automation',
    name: 'Budget automation',
    redirectUris: ['https://automation.example/callback'],
  };

  it('allows multiple clients and HTTP loopback callbacks', () => {
    expect(() =>
      validateOAuthClients([
        client,
        {
          ...client,
          clientId: 'local',
          redirectUris: ['http://127.0.0.1:8000/callback'],
        },
      ]),
    ).not.toThrow();
  });

  it('accepts optional registered HTTPS application icons', () => {
    expect(() =>
      validateOAuthClients([
        { ...client, logoUri: 'https://automation.example/icon.svg' },
      ]),
    ).not.toThrow();
  });

  it.each([
    'http://automation.example/icon.svg',
    'file:///tmp/icon.svg',
    'data:image/svg+xml,icon',
    'https://user:password@automation.example/icon.svg',
    '',
    null,
  ])('rejects invalid application icon URLs (%s)', logoUri => {
    expect(() => validateOAuthClients([{ ...client, logoUri }])).toThrow();
  });

  it.each(
    [
      null,
      [client, client],
      [{ ...client, name: '' }],
      [{ ...client, clientSecret: '' }],
      [{ ...client, clientSecret: 42 }],
      [{ ...client, redirectUris: [] }],
      [{ ...client, redirectUris: ['http://automation.example/callback'] }],
      [
        {
          ...client,
          redirectUris: ['https://user:password@automation.example/callback'],
        },
      ],
      [
        {
          ...client,
          redirectUris: ['https://automation.example/callback#fragment'],
        },
      ],
    ].map(clients => ({ clients })),
  )('rejects invalid registration $clients', ({ clients }) => {
    expect(() => validateOAuthClients(clients)).toThrow();
  });
});
