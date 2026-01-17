import ipaddr from 'ipaddr.js';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { handlers as app, clearAllowlistCache } from './app-cors-proxy';
import { config } from './load-config';
import { validateSession } from './util/validate-user';

vi.mock('./load-config', () => ({
  config: {
    get: vi.fn(),
  },
}));

vi.mock('./util/middlewares', () => ({
  requestLoggerMiddleware: (req, res, next) => next(),
}));

vi.mock('./util/validate-user', () => ({
  validateSession: vi.fn(),
}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('ipaddr.js', () => ({
  default: {
    isValid: vi.fn().mockReturnValue(false),
    parse: vi.fn(),
  },
}));

global.fetch = vi.fn();

describe('app-cors-proxy', () => {
  const defaultAllowlistedRepos = [
    'https://github.com/user/repo1',
    'https://github.com/user/repo2',
  ];

  const createFetchMock = (options = {}) => {
    const {
      allowlistedRepos = defaultAllowlistedRepos,
      allowlistFetchFails = false,
      allowlistHttpError = false,
      proxyResponses = {},
    } = options;

    return vi.fn().mockImplementation((url, _requestOptions) => {
      if (
        url ===
        'https://raw.githubusercontent.com/actualbudget/plugin-store/refs/heads/main/plugins.json'
      ) {
        if (allowlistFetchFails) {
          return Promise.reject(new Error('Network error'));
        }
        if (allowlistHttpError) {
          return Promise.resolve({
            ok: false,
            status: 404,
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              allowlistedRepos.map(repoUrl => ({ url: repoUrl })),
            ),
        });
      }

      if (proxyResponses[url]) {
        const response = proxyResponses[url];
        if (response.error) {
          return Promise.reject(response.error);
        }
        return Promise.resolve(response);
      }

      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('default response'),
        headers: {
          get: () => 'text/plain',
        },
        status: 200,
      });
    });
  };

  const comprehensiveProxyResponses = {
    'https://github.com/user/repo1': {
      ok: true,
      text: () => Promise.resolve('test content'),
      headers: { get: () => 'text/plain' },
      status: 200,
    },
    'https://api.github.com/repos/user/repo1/releases': {
      ok: true,
      text: () => Promise.resolve('{"name": "test"}'),
      headers: { get: () => 'application/json' },
      status: 200,
    },
    'https://api.github.com/repos/user/repo1': {
      ok: true,
      text: () => Promise.resolve('{"name": "repo1"}'),
      headers: { get: () => 'application/json' },
      status: 200,
    },
    'https://raw.githubusercontent.com/user/repo1/main/file.txt': {
      ok: true,
      text: () => Promise.resolve('file content'),
      headers: { get: () => 'text/plain' },
      status: 200,
    },
    'https://github.com/user/repo1/releases/download/v1.0.0/file.zip': {
      ok: true,
      arrayBuffer: () =>
        Promise.resolve(new TextEncoder().encode('release content').buffer),
      headers: { get: () => 'application/octet-stream' },
      status: 200,
    },
    'https://github.com/user/repo1/manifest.json': {
      ok: true,
      text: () =>
        Promise.resolve(JSON.stringify({ name: 'test', version: '1.0.0' })),
      headers: { get: () => 'application/json' },
      status: 200,
    },
    'https://github.com/user/repo1/package.json': {
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ test: true })),
      headers: { get: () => 'text/plain' },
      status: 200,
    },
    'https://github.com/user/repo1/readme.txt': {
      ok: true,
      text: () => Promise.resolve('Hello, world!'),
      headers: { get: () => 'text/plain' },
      status: 200,
    },
    'https://github.com/user/repo1/file.bin': {
      ok: true,
      arrayBuffer: () =>
        Promise.resolve(new Uint8Array([1, 2, 3, 4, 5]).buffer),
      headers: { get: () => 'application/octet-stream' },
      status: 200,
    },
    'https://github.com/user/repo1/invalid.json': {
      ok: true,
      text: () => Promise.resolve('not valid json'),
      headers: { get: () => 'text/plain' },
      status: 200,
    },
    'https://github.com/user/repo1/network-error': {
      error: new Error('Network error'),
    },
  };

  beforeAll(() => {
    global.fetch = createFetchMock({
      proxyResponses: comprehensiveProxyResponses,
    });
  });

  beforeEach(() => {
    validateSession.mockClear?.();
    ipaddr.isValid.mockClear?.();
    ipaddr.parse.mockClear?.();

    validateSession.mockReturnValue({ userId: 'test-user' });

    clearAllowlistCache();

    vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
  });

  describe('CORS preflight', () => {
    it('should handle OPTIONS requests properly', async () => {
      const res = await request(app)
        .options('/')
        .query({ url: 'https://example.com' });

      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toBe(
        'GET,HEAD,OPTIONS',
      );
      expect(res.headers['access-control-allow-headers']).toBe(
        'Content-Type, X-Actual-Token',
      );
      expect(res.headers['access-control-max-age']).toBe('600');
    });
  });

  describe('URL parameter validation', () => {
    it('should return 400 if url parameter is missing', async () => {
      validateSession.mockReturnValue({ userId: 'test-user' });

      const res = await request(app).get('/');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Missing url parameter');
    });

    it('should return 400 if url parameter is invalid', async () => {
      validateSession.mockReturnValue({ userId: 'test-user' });

      const res = await request(app).get('/').query({ url: 'invalid-url' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid url parameter');
    });
  });

  describe('Session validation', () => {
    it('should return early if validateSession fails', async () => {
      validateSession.mockImplementation((req, res) => {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
      });

      const res = await request(app)
        .get('/')
        .query({ url: 'https://example.com' });

      expect(res.statusCode).toBe(401);
      expect(validateSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('URL allowlist validation', () => {
    beforeEach(() => {
      validateSession.mockReturnValue({ userId: 'test-user' });
    });

    it('should block private IP addresses', async () => {
      ipaddr.isValid.mockReturnValueOnce(true);
      ipaddr.parse.mockReturnValueOnce({
        range: () => 'private',
      });

      const res = await request(app)
        .get('/')
        .query({ url: 'http://192.168.1.1/test' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('URL not allowed');
      expect(console.warn).toHaveBeenCalledWith(
        'Blocked request to private/localhost IP: 192.168.1.1',
      );
    });

    it('should block loopback addresses', async () => {
      ipaddr.isValid.mockReturnValueOnce(true);
      ipaddr.parse.mockReturnValueOnce({
        range: () => 'loopback',
      });

      const res = await request(app)
        .get('/')
        .query({ url: 'http://127.0.0.1/test' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('URL not allowed');
    });

    it('should allow allowlisted repository URLs', async () => {
      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.statusCode).toBe(200);
    });

    it('should allow GitHub API URLs for allowlisted repos', async () => {
      const res = await request(app)
        .get('/')
        .query({ url: 'https://api.github.com/repos/user/repo1/releases' });

      expect(res.statusCode).toBe(200);
    });

    it('should allow raw.githubusercontent.com URLs for allowlisted repos', async () => {
      const res = await request(app).get('/').query({
        url: 'https://raw.githubusercontent.com/user/repo1/main/file.txt',
      });

      expect(res.statusCode).toBe(200);
    });

    it('should allow github.com release URLs for allowlisted repos', async () => {
      const res = await request(app).get('/').query({
        url: 'https://github.com/user/repo1/releases/download/v1.0.0/file.zip',
      });

      expect(res.statusCode).toBe(200);
    });

    it('should block non-allowlisted URLs', async () => {
      const res = await request(app)
        .get('/')
        .query({ url: 'https://malicious.com/evil' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('URL not allowed');
      expect(console.warn).toHaveBeenCalledWith(
        'Blocked request to unauthorized URL:',
        'https://malicious.com/evil',
      );
    });
  });

  describe('Allowlist fetching and caching', () => {
    beforeEach(() => {
      validateSession.mockReturnValue({ userId: 'test-user' });
    });

    it('should fetch allowlist on first request', async () => {
      await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/actualbudget/plugin-store/refs/heads/main/plugins.json',
      );
    });

    it('should handle allowlist fetch failure gracefully', async () => {
      global.fetch = createFetchMock({
        allowlistFetchFails: true,
        proxyResponses: comprehensiveProxyResponses,
      });

      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.statusCode).toBe(403);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch plugin allowlist:',
        expect.any(Error),
      );

      global.fetch = createFetchMock({
        proxyResponses: comprehensiveProxyResponses,
      });
    });

    it('should handle allowlist fetch HTTP error', async () => {
      global.fetch = createFetchMock({
        allowlistHttpError: true,
        proxyResponses: comprehensiveProxyResponses,
      });

      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.statusCode).toBe(403);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch plugin allowlist:',
        expect.any(Error),
      );

      global.fetch = createFetchMock({
        proxyResponses: comprehensiveProxyResponses,
      });
    });
  });

  describe('HTTP method validation', () => {
    beforeEach(() => {
      validateSession.mockReturnValue({ userId: 'test-user' });
    });

    it('should allow GET method', async () => {
      const res = await request(app)
        .get('/')
        .send({ method: 'GET' })
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.statusCode).toBe(200);
    });

    it('should allow HEAD method', async () => {
      const res = await request(app)
        .get('/')
        .send({ method: 'HEAD' })
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.statusCode).toBe(200);
    });

    it('should block POST method', async () => {
      const res = await request(app)
        .get('/')
        .send({ method: 'POST' })
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.statusCode).toBe(405);
      expect(res.body.error).toBe('Method not allowed');
    });

    it('should block PUT method', async () => {
      const res = await request(app)
        .get('/')
        .send({ method: 'PUT' })
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.statusCode).toBe(405);
      expect(res.body.error).toBe('Method not allowed');
    });
  });

  describe('GitHub authentication', () => {
    beforeEach(() => {
      validateSession.mockReturnValue({ userId: 'test-user' });
    });

    it('should add GitHub authentication for api.github.com when token is configured', async () => {
      config.get.mockReturnValue('test-github-token');

      await request(app)
        .get('/')
        .query({ url: 'https://api.github.com/repos/user/repo1' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
            'User-Agent': 'Actual-Budget-Plugin-System',
          }),
        }),
      );
    });

    it('should add GitHub authentication for raw.githubusercontent.com when token is configured', async () => {
      config.get.mockReturnValue('test-github-token');

      await request(app).get('/').query({
        url: 'https://raw.githubusercontent.com/user/repo1/main/file.txt',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/user/repo1/main/file.txt',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
            'User-Agent': 'Actual-Budget-Plugin-System',
          }),
        }),
      );
    });

    it('should not add GitHub authentication when token is not configured', async () => {
      config.get.mockReturnValue(null);

      await request(app)
        .get('/')
        .query({ url: 'https://api.github.com/repos/user/repo1' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo1',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('Response handling', () => {
    beforeEach(() => {
      validateSession.mockReturnValue({ userId: 'test-user' });
    });

    it('should handle JSON responses', async () => {
      const jsonData = { name: 'test', version: '1.0.0' };

      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1/manifest.json' });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body).toEqual(jsonData);
    });

    it('should handle text responses', async () => {
      const textContent = 'Hello, world!';

      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1/readme.txt' });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toBe(textContent);
    });

    it('should handle binary responses', async () => {
      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1/file.bin' });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body).toEqual({
        data: [1, 2, 3, 4, 5],
        contentType: 'application/octet-stream',
        isBinary: true,
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1/invalid.json' });

      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('not valid json');
    });

    it('should detect JSON from URL patterns', async () => {
      const jsonData = { test: true };

      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1/package.json' });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body).toEqual(jsonData);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      validateSession.mockReturnValue({ userId: 'test-user' });
    });

    it('should handle fetch errors', async () => {
      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1/network-error' });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error proxying request');
      expect(res.body.details).toBe('Network error');
    });

    it('should handle invalid repository URLs in allowlist', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ url: 'invalid-url' }]),
      });

      const res = await request(app)
        .get('/')
        .query({ url: 'https://example.com' });

      expect(res.statusCode).toBe(403);
      expect(console.warn).toHaveBeenCalledWith(
        'Blocked request to unauthorized URL:',
        'https://example.com/',
      );
    });
  });

  describe('CORS headers', () => {
    beforeEach(() => {
      validateSession.mockReturnValue({ userId: 'test-user' });
    });

    it('should set CORS headers on successful responses', async () => {
      const res = await request(app)
        .get('/')
        .query({ url: 'https://github.com/user/repo1' });

      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
  });
});
