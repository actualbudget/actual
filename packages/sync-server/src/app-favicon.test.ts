import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handlers as app } from './app-favicon';
import { validateSession } from './util/validate-user';

const dnsLookupMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 as const }]),
);

vi.mock('node:dns/promises', () => ({
  lookup: dnsLookupMock,
}));

vi.mock('./util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

vi.mock('./util/validate-user', () => ({
  validateSession: vi.fn(),
}));

global.fetch = vi.fn();

const mockedValidateSession = vi.mocked(validateSession);
const mockedFetch = vi.mocked(global.fetch);

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
}

function imageResponse(contentType: string, byteLength = 256): Response {
  const bytes = new Uint8Array(byteLength).fill(0x55);
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': contentType,
      'content-length': String(byteLength),
    },
  });
}

describe('app-favicon', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedValidateSession.mockReturnValue({ userId: 'test-user' });
    dnsLookupMock.mockReset();
    dnsLookupMock.mockResolvedValue([
      { address: '8.8.8.8', family: 4 as const },
    ]);
    vi.spyOn(console, 'warn').mockImplementation(vi.fn());
  });

  it('returns 401 when validateSession rejects', async () => {
    mockedValidateSession.mockImplementationOnce((_req, res) => {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    });

    const res = await request(app)
      .get('/')
      .query({ url: 'https://bank.example' });

    expect(res.statusCode).toBe(401);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('returns 400 when no url/domain is provided', async () => {
    const res = await request(app).get('/');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Missing url/);
  });

  it('returns 400 for an invalid URL', async () => {
    const res = await request(app).get('/').query({ url: '   ' });

    expect(res.statusCode).toBe(400);
  });

  it('uses <link rel="icon"> from the homepage when present', async () => {
    mockedFetch
      .mockResolvedValueOnce(
        htmlResponse(
          '<html><head><link rel="icon" href="/static/icon.png"></head></html>',
        ),
      )
      .mockResolvedValueOnce(imageResponse('image/png', 512));

    const res = await request(app)
      .get('/')
      .query({ url: 'https://bank.example' });

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('direct');
    expect(res.body.contentType).toBe('image/png');
    expect(res.body.base64).toEqual(expect.any(String));
    expect(res.body.base64.length).toBeGreaterThan(0);

    const firstCall = mockedFetch.mock.calls[0][0];
    const secondCall = mockedFetch.mock.calls[1][0];
    expect(firstCall).toBe('https://bank.example/');
    expect(secondCall).toBe('https://bank.example/static/icon.png');
  });

  it('uses <link rel="icon"> from the homepage when domain= is provided', async () => {
    mockedFetch
      .mockResolvedValueOnce(
        htmlResponse(
          '<html><head><link rel="icon" href="/static/icon.png"></head></html>',
        ),
      )
      .mockResolvedValueOnce(imageResponse('image/png', 512));

    const res = await request(app).get('/').query({ domain: 'bank.example' });

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('direct');
    expect(res.body.contentType).toBe('image/png');
    expect(res.body.base64).toEqual(expect.any(String));
    expect(res.body.base64.length).toBeGreaterThan(0);

    const firstCall = mockedFetch.mock.calls[0][0];
    const secondCall = mockedFetch.mock.calls[1][0];
    expect(firstCall).toBe('https://bank.example/');
    expect(secondCall).toBe('https://bank.example/static/icon.png');
  });

  it('falls back to /favicon.ico when homepage lacks a link tag', async () => {
    mockedFetch
      .mockResolvedValueOnce(
        htmlResponse('<html><head><title>Bank</title></head></html>'),
      )
      .mockResolvedValueOnce(imageResponse('image/x-icon', 256));

    const res = await request(app)
      .get('/')
      .query({ url: 'https://bank.example' });

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('direct');
    expect(mockedFetch.mock.calls.at(-1)?.[0]).toBe(
      'https://bank.example/favicon.ico',
    );
  });

  it('falls back to DuckDuckGo when both direct attempts fail', async () => {
    mockedFetch
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))
      .mockResolvedValueOnce(new Response('boom', { status: 404 }))
      .mockResolvedValueOnce(imageResponse('image/png', 256));

    const res = await request(app).get('/').query({ url: 'bank.example' });

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('duckduckgo');
    const lastCall = mockedFetch.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).toContain('icons.duckduckgo.com/ip3/bank.example.ico');
  });

  it('rejects payloads larger than the size cap', async () => {
    mockedFetch
      .mockResolvedValueOnce(
        htmlResponse(
          '<html><head><link rel="icon" href="/icon.png"></head></html>',
        ),
      )
      .mockResolvedValueOnce(imageResponse('image/png', 64 * 1024))
      .mockResolvedValueOnce(imageResponse('image/x-icon', 64 * 1024))
      .mockResolvedValueOnce(imageResponse('image/png', 64 * 1024));

    const res = await request(app)
      .get('/')
      .query({ url: 'https://bank.example' });

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toMatch(/too large/);
  });

  it('returns 502 if every source fails', async () => {
    mockedFetch
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    const res = await request(app)
      .get('/')
      .query({ url: 'https://bank.example' });

    expect(res.statusCode).toBe(502);
  });

  it('blocks private IP hostnames (SSRF guard)', async () => {
    const res = await request(app).get('/').query({ url: 'http://10.0.0.1/' });

    expect(res.statusCode).toBe(403);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
