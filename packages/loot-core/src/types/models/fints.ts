export type SyncServerFinTSAccount = {
  account_id: string;
  name: string;
  institution?: string;
  orgDomain?: string | null;
  orgId?: string;
  iban?: string;
  currency?: string;
  balance?: number;
};

/** A bank login as listed by the sync server. Never contains the PIN. */
export type FinTSConnection = {
  id: string;
  name: string;
  blz: string;
  url: string;
  userId: string;
  customerId?: string;
  bankName?: string;
  hasStoredPin: boolean;
};

export type FinTSConnectionInput = {
  id?: string;
  name: string;
  blz: string;
  url: string;
  userId: string;
  customerId?: string;
};

export type FinTSStatus = {
  configured: boolean;
  productIdFromConfig: boolean;
  bankListAvailable: boolean;
  connections: FinTSConnection[];
};

export type FinTSBank = {
  blz: string;
  name: string;
  city: string;
  url: string;
};

export type FinTSTanMethodOption = {
  id: number;
  name: string;
  isDecoupled: boolean;
};

/** The next step of a bank login, as decided by the sync server. */
export type FinTSAuthState =
  | { state: 'ready' }
  | { state: 'cancelled' }
  | { state: 'pin-required'; rejected: boolean; message?: string }
  | { state: 'tan-method-required'; methods: FinTSTanMethodOption[] }
  | { state: 'tan-media-required'; media: string[] }
  | {
      state: 'tan-required';
      tanReference: string;
      challenge?: string;
      photo?: { mimeType: string; data: string };
      decoupled: boolean;
      pollIntervalSeconds: number;
    }
  | { state: 'error'; code: string; message?: string };

export type FinTSAuthInput = {
  connectionId: string;
  pin?: string;
  storePin?: boolean;
  tanMethodId?: number;
  tanMediaName?: string;
  tanReference?: string;
  tan?: string;
  cancel?: boolean;
  refresh?: boolean;
};
