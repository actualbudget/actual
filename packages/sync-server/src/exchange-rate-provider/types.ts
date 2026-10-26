export type RateProviderPlugin = {
  apiVersion: 1;
  id: string;
  name: string;
  version: string;
  origins: string[];
  fields: Array<{
    key: string;
    label: string;
    secret: boolean;
    required: boolean;
  }>;
  lookup(
    request: { base: string; quote: string; date: string },
    context: { config: Record<string, string>; signal: AbortSignal },
  ): Promise<
    | {
        status: 'ok';
        base: string;
        quote: string;
        rate: string;
        effectiveDate: string;
      }
    | { status: 'missing' }
    | { status: 'error'; code: 'auth' | 'rate-limited' | 'unavailable' }
  >;
};
