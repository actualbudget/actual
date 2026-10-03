/** `rate` is quote major units per one base major unit, as a decimal string. */
export type ExchangeRateEntity = {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: string;
  kind: ExchangeRateKind;
  source: string;
  /** Full ISO-8601 UTC timestamp; manual rates use midnight UTC. */
  timestamp: string;
  /** Internal authority cell for rate and kind. */
  spec?: string | null;
  tombstone: 0 | 1;
};

/** `dated` is a manual fallback for one calendar day. `fetched` is a provider observation. */
export type ExchangeRateKind = 'dated' | 'fetched';
