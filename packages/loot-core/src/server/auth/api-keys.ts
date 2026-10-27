import * as asyncStorage from '#platform/server/asyncStorage';
import { fetch } from '#platform/server/fetch';
import { getServer } from '#server/server-config';

export type ApiKey = {
  id: string;
  name: string;
  fileId: string;
  createdAt: number;
};

async function request<T>(
  method: string,
  path = '',
  body?: unknown,
): Promise<T> {
  const server = getServer();
  const token = await asyncStorage.getItem('user-token');
  if (!server || !token) {
    throw new Error('Not connected to a sync server');
  }
  const response = await fetch(
    server.BASE_SERVER.replace(/\/$/, '') + '/api-keys' + path,
    {
      method,
      headers: { 'X-ACTUAL-TOKEN': token, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  if (!response.ok) {
    throw new Error('API key request failed');
  }
  return (await response.json()).data;
}

export function listApiKeys(): Promise<ApiKey[]> {
  return request('GET');
}

export function createApiKey(data: {
  name: string;
  fileId: string;
}): Promise<ApiKey & { key: string }> {
  return request('POST', '', data);
}

export function revokeApiKey({ id }: { id: string }): Promise<void> {
  return request('DELETE', '/' + encodeURIComponent(id));
}
