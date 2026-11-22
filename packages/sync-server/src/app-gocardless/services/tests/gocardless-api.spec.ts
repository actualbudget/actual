import { fetch } from 'undici';
import type * as Undici from 'undici';
import type { MockedFunction } from 'vitest';

import type { GoCardlessInstitutionId } from '#app-gocardless/gocardless-node.types';
import { GoCardlessApi } from '#app-gocardless/services/gocardless-api';

vi.mock('undici', async importOriginal => ({
  ...(await importOriginal<typeof Undici>()),
  fetch: vi.fn(),
}));

const mockedFetch = fetch as unknown as MockedFunction<
  (url: URL, init: { method: string; body?: string }) => Promise<Response>
>;

const institutionId = 'ING_INGBITMM' as GoCardlessInstitutionId;

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestsTo(path: string) {
  return mockedFetch.mock.calls.filter(([url]) => url.pathname.endsWith(path));
}

describe('GoCardlessApi#initSession', () => {
  let api: GoCardlessApi;

  beforeEach(() => {
    api = new GoCardlessApi({ secretId: 'id', secretKey: 'key' });
    mockedFetch.mockImplementation(async url =>
      url.pathname.endsWith('/agreements/enduser/')
        ? jsonResponse({ id: 'agreement-id' })
        : jsonResponse({ id: 'requisition-id', link: 'https://link' }),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('creates an end-user agreement and binds the requisition to it by default', async () => {
    await api.initSession({ redirectUrl: 'https://redirect', institutionId });

    expect(requestsTo('/agreements/enduser/')).toHaveLength(1);
    const [[, init]] = requestsTo('/requisitions/');
    expect(JSON.parse(init.body ?? '{}')).toMatchObject({
      agreement: 'agreement-id',
    });
  });

  it('skips the end-user agreement when asked to', async () => {
    await api.initSession({
      redirectUrl: 'https://redirect',
      institutionId,
      skipEndUserAgreement: true,
    });

    expect(requestsTo('/agreements/enduser/')).toHaveLength(0);
    const [[, init]] = requestsTo('/requisitions/');
    expect(JSON.parse(init.body ?? '{}')).not.toHaveProperty('agreement');
  });
});
