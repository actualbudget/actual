# TrueLayer Integration Implementation Plan

**Based on**: GoCardless pattern analysis + TrueLayer OAuth documentation
**Reference**: https://github.com/erwindouna/truelayer2firefly
**Branch**: `feat/truelayer-bank-sync`

## Progress Summary

**Status**: ✅ Phase 1 & 2 Complete - TrueLayer Integration Ready

| Component | Status | Commits |
|-----------|--------|---------|
| **Phase 1: Backend** | | |
| Secrets & Config | ✅ Complete | 7c1ad7f |
| Type Definitions | ✅ Complete | 4eab4e3 |
| Service Structure | ✅ Complete | fe7b49f |
| Service Methods | ✅ Complete | 64a9c3e |
| Express Routes | ✅ Complete | 297560a |
| Route Registration | ✅ Complete | 77561162d |
| RPC Handlers | ✅ Complete | 5830c94c7 |
| Sync Integration | ✅ Complete | 181471a56 |
| **Phase 2: Frontend** | | |
| Status Hook | ✅ Complete | TBD |
| Authorization Helper | ✅ Complete | TBD |
| Initialization Modal | ✅ Complete | TBD |
| External Message Modal | ✅ Complete | TBD |
| Link Component | ✅ Complete | TBD |
| Modal Registration | ✅ Complete | TBD |
| CreateAccountModal | ✅ Complete | TBD |
| BankSync Component | ✅ Complete | TBD |
| Account Linking | ✅ Complete | TBD |
| Modal Type Definitions | ✅ Complete | TBD |

**What Works Now:**

**Backend (Phase 1):**
- ✅ TrueLayer secrets management configured
- ✅ Provider type system recognizes 'truelayer'
- ✅ Server configuration includes TRUELAYER_SERVER endpoint
- ✅ Complete type definitions for TrueLayer API
- ✅ OAuth flow implementation (createAuthLink, token exchange, refresh)
- ✅ Account and transaction fetching with normalization
- ✅ Error handling with custom error classes
- ✅ Session management for OAuth polling
- ✅ Express router with 7 HTTP endpoints
- ✅ Routes registered in sync server app
- ✅ RPC handlers for frontend communication
- ✅ Transaction sync integration with downloadTrueLayerTransactions

**Frontend (Phase 2):**
- ✅ useTrueLayerStatus hook for configuration checking
- ✅ authorizeBank function following GoCardless pattern
- ✅ TrueLayerInitialiseModal for client ID/secret setup
- ✅ TrueLayerExternalMsgModal for OAuth flow
- ✅ TrueLayerLink component for OAuth callback
- ✅ Modal registration in Modals.tsx
- ✅ TrueLayer integration in CreateAccountModal (UK bank accounts)
- ✅ BankSync component updated to display 'TrueLayer'
- ✅ linkAccountTrueLayer action in accountsSlice
- ✅ SelectLinkedAccountsModal supports TrueLayer accounts
- ✅ Modal type definitions in modalsSlice

**Testing:**
- ✅ All tests passing (loot-core: 58s, sync-server: 21.8s, web: 37s)
- ✅ TypeScript compilation successful
- ✅ No test failures

**Next Steps:**
1. End-to-end testing with real TrueLayer credentials
2. Test OAuth flow in browser with actual UK bank
3. Verify transaction sync with live data
4. Create pull request for code review

---

## Architecture Overview

TrueLayer will follow the **GoCardless pattern** (OAuth-based) rather than SimpleFIN (token-based):

```
OAuth Authorization → Account Linking → Transaction Sync → Continuous Updates
```

## Key Differences from Tink (Abandoned Approach)

1. **No SDK Required** - Direct REST API calls like GoCardless
2. **Standard OAuth 2.0** - Same callback pattern as GoCardless
3. **2 Credentials Only** - Client ID + Client Secret (no market field)
4. **No Provider Selection** - TrueLayer provides institution list via API
5. **Simpler Token Management** - Access + Refresh tokens (1 hour + long-lived)

---

## Phase 1: Backend Infrastructure

### 1.1 Create Backend Service Directory

**Location**: `packages/sync-server/src/app-truelayer/`

**Files to create**:

```
app-truelayer/
├── app-truelayer.js          # Express router (mirrors app-gocardless.js)
├── services/
│   └── truelayer-service.js  # TrueLayer API integration
├── errors.js                 # Custom error classes
├── truelayer.types.ts        # TrueLayer API types
└── link.html                 # OAuth callback page (reuse GoCardless pattern)
```

### 1.2 Express Router (`app-truelayer.js`)

**Endpoints to implement**:

```javascript
POST /truelayer/status
  → Check if TrueLayer is configured (credentials exist)

POST /truelayer/create-web-token
  → Generate OAuth authorization URL
  → Create auth session
  → Return { link, authId }

POST /truelayer/get-accounts
  → Poll authorization status
  → Exchange auth code for access token
  → Fetch and return account list

GET /truelayer/link
  → Serve link.html (OAuth callback page)
  → Closes window automatically
```

**Pattern from GoCardless**:

```javascript
import express from 'express';
import { secretsService } from '../services/secrets-service.js';
import * as truelayerService from './services/truelayer-service.js';

const app = express();

app.post('/status', async (req, res) => {
  const configured = truelayerService.isConfigured();
  res.send({ configured });
});

app.post('/create-web-token', async (req, res) => {
  try {
    const { host } = req.body;
    const result = await truelayerService.createAuthLink({ host });
    res.send(result);
  } catch (err) {
    // Error handling
  }
});

app.post('/get-accounts', async (req, res) => {
  try {
    const { authId } = req.body;
    const result = await truelayerService.getAccountsWithAuth(authId);
    res.send(result);
  } catch (err) {
    // Error handling with custom error classes
  }
});

// ... more endpoints

export const handlers = app;
```

### 1.3 TrueLayer Service (`services/truelayer-service.js`)

**Core Methods**:

```javascript
export function isConfigured() {
  const clientId = secretsService.get('truelayer_clientId');
  const clientSecret = secretsService.get('truelayer_clientSecret');
  return !!(clientId && clientSecret);
}

export async function createAuthLink({ host }) {
  // 1. Generate state parameter (CSRF protection)
  const state = crypto.randomUUID();

  // 2. Store state in memory/db for verification
  // (could use simple Map or database table)

  // 3. Build OAuth URL
  const authUrl = new URL('https://auth.truelayer.com/');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', secretsService.get('truelayer_clientId'));
  authUrl.searchParams.set('scope', 'info accounts balance transactions offline_access');
  authUrl.searchParams.set('redirect_uri', `${host}/truelayer/callback`);
  authUrl.searchParams.set('state', state);

  return {
    link: authUrl.toString(),
    authId: state
  };
}

export async function getAccountsWithAuth(authId) {
  // 1. Check if authId has received callback
  // 2. If not ready, throw NotLinkedError (polling will continue)
  // 3. If ready, exchange code for tokens
  // 4. Fetch accounts from TrueLayer API
  // 5. Return normalized accounts
}

export async function exchangeCodeForToken(code, redirectUri) {
  const response = await fetch('https://auth.truelayer.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: secretsService.get('truelayer_clientId'),
      client_secret: secretsService.get('truelayer_clientSecret'),
      redirect_uri: redirectUri,
      code: code
    })
  });

  return response.json();
  // Returns: { access_token, refresh_token, expires_in, scope }
}

export async function getAccounts(accessToken) {
  const response = await fetch('https://api.truelayer.com/data/v1/accounts', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  // Normalize to Actual Budget format
  return normalizeAccounts(data.results);
}

export async function getTransactions(accessToken, accountId, startDate, endDate) {
  const url = new URL(`https://api.truelayer.com/data/v1/accounts/${accountId}/transactions`);
  url.searchParams.set('from', startDate);
  url.searchParams.set('to', endDate);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  return normalizeTransactions(data.results);
}

export async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://auth.truelayer.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: secretsService.get('truelayer_clientId'),
      client_secret: secretsService.get('truelayer_clientSecret'),
      refresh_token: refreshToken
    })
  });

  return response.json();
}

function normalizeAccounts(truelayerAccounts) {
  return truelayerAccounts.map(account => ({
    account_id: account.account_id,
    name: account.display_name,
    official_name: account.display_name,
    mask: account.account_number?.number?.slice(-4) || '',
    institution: account.provider?.display_name || 'Unknown',
    balance: 0, // Will be fetched separately
    type: account.account_type
  }));
}

function normalizeTransactions(truelayerTransactions) {
  return truelayerTransactions.map(tx => ({
    transactionId: tx.transaction_id,
    date: tx.timestamp.split('T')[0], // ISO → YYYY-MM-DD
    payeeName: tx.merchant_name || tx.description,
    notes: tx.description,
    booked: tx.transaction_type !== 'PENDING',
    transactionAmount: {
      amount: tx.amount,
      currency: tx.currency
    },
    balanceAfterTransaction: tx.running_balance ? {
      amount: tx.running_balance.amount,
      currency: tx.running_balance.currency
    } : undefined
  }));
}
```

### 1.4 Custom Error Classes (`errors.js`)

Reuse GoCardless pattern:

```javascript
export class InvalidTrueLayerTokenError extends Error {
  constructor() {
    super('Invalid TrueLayer access token');
    this.name = 'InvalidTrueLayerTokenError';
  }
}

export class AuthorizationNotLinkedError extends Error {
  constructor() {
    super('Authorization not completed yet');
    this.name = 'AuthorizationNotLinkedError';
  }
}

// ... more error classes
```

### 1.5 Register in Sync Server

**File**: `packages/sync-server/src/app.ts`

```javascript
import * as truelayerApp from './app-truelayer/app-truelayer';

// ... existing routes
app.use('/truelayer', truelayerApp.handlers);
```

---

## Phase 2: Type Definitions

### 2.1 Create TrueLayer Types

**File**: `packages/loot-core/src/types/models/truelayer.ts`

```typescript
import { type AccountEntity } from './account';
import { type BankSyncResponse } from './bank-sync';

export type TrueLayerAccount = {
  account_id: string;
  account_type: string;
  display_name: string;
  currency: string;
  account_number?: {
    iban?: string;
    number?: string;
    sort_code?: string;
  };
  provider?: {
    provider_id: string;
    display_name: string;
  };
};

export type TrueLayerBalance = {
  current: number;
  available?: number;
  currency: string;
  update_timestamp: string;
};

export type TrueLayerTransaction = {
  transaction_id: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_category: string;
  merchant_name?: string;
  running_balance?: {
    amount: number;
    currency: string;
  };
};

export type SyncServerTrueLayerAccount = {
  balance: number;
  account_id: string;
  institution?: string;
  name: string;
  type?: string;
  official_name?: string;
  mask?: string;
};

export type TrueLayerAuthSession = {
  authId: string;
  link: string;
};
```

### 2.2 Update Provider Type

**File**: `packages/loot-core/src/types/models/bank-sync.ts`

```typescript
export type BankSyncProviders =
  | 'goCardless'
  | 'simpleFin'
  | 'pluggyai'
  | 'truelayer';
```

### 2.3 Export Types

**File**: `packages/loot-core/src/types/models/index.ts`

```typescript
export type * from './truelayer';
```

---

## Phase 3: Server Configuration

### 3.1 Add TrueLayer Server Config

**File**: `packages/loot-core/src/server/server-config.ts`

```typescript
type ServerConfig = {
  BASE_SERVER: string;
  SYNC_SERVER: string;
  SIGNUP_SERVER: string;
  GOCARDLESS_SERVER: string;
  SIMPLEFIN_SERVER: string;
  PLUGGYAI_SERVER: string;
  TRUELAYER_SERVER: string; // Add this
};

export function getServer(url?: string): ServerConfig | null {
  if (url) {
    try {
      return {
        BASE_SERVER: url,
        SYNC_SERVER: joinURL(url, '/sync'),
        SIGNUP_SERVER: joinURL(url, '/account'),
        GOCARDLESS_SERVER: joinURL(url, '/gocardless'),
        SIMPLEFIN_SERVER: joinURL(url, '/simplefin'),
        PLUGGYAI_SERVER: joinURL(url, '/pluggyai'),
        TRUELAYER_SERVER: joinURL(url, '/truelayer'), // Add this
      };
    } catch (error) {
      logger.warn('Unable to parse server URL', { config }, error);
      return config;
    }
  }
  return config;
}
```

### 3.2 Add TrueLayer Secrets

**File**: `packages/sync-server/src/services/secrets-service.js`

```javascript
export const SecretName = {
  gocardless_secretId: 'gocardless_secretId',
  gocardless_secretKey: 'gocardless_secretKey',
  simplefin_token: 'simplefin_token',
  simplefin_accessKey: 'simplefin_accessKey',
  pluggyai_clientId: 'pluggyai_clientId',
  pluggyai_clientSecret: 'pluggyai_clientSecret',
  pluggyai_itemIds: 'pluggyai_itemIds',
  truelayer_clientId: 'truelayer_clientId',       // Add this
  truelayer_clientSecret: 'truelayer_clientSecret', // Add this
};
```

---

## Phase 4: RPC Handlers

### 4.1 Add TrueLayer RPC Methods

**File**: `packages/loot-core/src/server/accounts/app.ts`

**Type definitions**:

```typescript
type Handlers = {
  // ... existing handlers
  'truelayer-status': typeof trueLayerStatus;
  'truelayer-create-web-token': typeof createTrueLayerWebToken;
  'truelayer-poll-web-token': typeof pollTrueLayerWebToken;
  'truelayer-poll-web-token-stop': typeof stopTrueLayerWebTokenPolling;
  'truelayer-accounts-link': typeof linkTrueLayerAccount;
};
```

**Implementation** (follow GoCardless pattern exactly):

```typescript
import { type SyncServerTrueLayerAccount } from '../../types/models';

async function trueLayerStatus() {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.TRUELAYER_SERVER + '/status',
    {},
    { ...getHeadersWithUserToken(userToken) }
  ).catch(handleRequestError);
}

async function createTrueLayerWebToken(
  args: { institutionId: string }
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.TRUELAYER_SERVER + '/create-web-token',
    args,
    { ...getHeadersWithUserToken(userToken) }
  ).catch(handleRequestError);
}

let truelayerPolling: NodeJS.Timeout | null = null;

async function pollTrueLayerWebToken(args: { authId: string }) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = 600000; // 10 minutes

    truelayerPolling = setInterval(async () => {
      try {
        const result = await post(
          serverConfig.TRUELAYER_SERVER + '/get-accounts',
          { authId: args.authId },
          { ...getHeadersWithUserToken(userToken) }
        );

        // If successful, stop polling and resolve
        clearInterval(truelayerPolling!);
        truelayerPolling = null;
        resolve(result);
      } catch (error) {
        // Check if it's "not linked yet" error - continue polling
        if (error.type === 'AuthorizationNotLinkedError') {
          // Check timeout
          if (Date.now() - startTime > timeout) {
            clearInterval(truelayerPolling!);
            truelayerPolling = null;
            reject(new Error('Timeout waiting for authorization'));
          }
          // Otherwise continue polling
          return;
        }

        // Other errors - stop and reject
        clearInterval(truelayerPolling!);
        truelayerPolling = null;
        reject(error);
      }
    }, 3000); // Poll every 3 seconds
  });
}

async function stopTrueLayerWebTokenPolling() {
  if (truelayerPolling) {
    clearInterval(truelayerPolling);
    truelayerPolling = null;
  }
}

async function linkTrueLayerAccount({
  externalAccount,
  upgradingId,
  offBudget = false,
}: {
  externalAccount: SyncServerTrueLayerAccount;
  upgradingId?: AccountEntity['id'] | undefined;
  offBudget?: boolean | undefined;
}) {
  let id;

  const institution = {
    name: externalAccount.institution ?? t('Unknown'),
  };

  // authId is used as bank_id (similar to requisitionId in GoCardless)
  const bank = await link.findOrCreateBank(
    institution,
    externalAccount.account_id  // Using account_id as unique identifier
  );

  if (upgradingId) {
    const accRow = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ?',
      [upgradingId]
    );

    if (!accRow) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }

    id = accRow.id;
    await db.update('accounts', {
      id,
      account_id: externalAccount.account_id,
      bank: bank.id,
      account_sync_source: 'truelayer',
    });
  } else {
    id = uuidv4();
    await db.insertWithUUID('accounts', {
      id,
      account_id: externalAccount.account_id,
      mask: externalAccount.mask,
      name: externalAccount.name,
      official_name: externalAccount.official_name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: 'truelayer',
    });
    await db.insertPayee({
      name: '',
      transfer_acct: id,
    });
  }

  await bankSync.syncAccount(
    undefined,
    undefined,
    id,
    externalAccount.account_id,
    bank.bank_id
  );

  connection.send('sync-event', {
    type: 'success',
    tables: ['transactions'],
  });

  return id;
}
```

**Register methods**:

```typescript
app.method('truelayer-status', trueLayerStatus);
app.method('truelayer-create-web-token', createTrueLayerWebToken);
app.method('truelayer-poll-web-token', pollTrueLayerWebToken);
app.method('truelayer-poll-web-token-stop', stopTrueLayerWebTokenPolling);
app.method('truelayer-accounts-link', linkTrueLayerAccount);
```

---

## Phase 5: Transaction Sync Integration

### 5.1 Update Bank Sync Logic

**File**: `packages/loot-core/src/server/accounts/sync.ts`

Add TrueLayer case to sync logic:

```typescript
async function downloadTrueLayerTransactions(
  acctId: string,
  accountId: string,
  bankId: string,
  startDate?: string,
  endDate?: string
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.TRUELAYER_SERVER + '/transactions',
    {
      accountId,
      startDate,
      endDate
    },
    { ...getHeadersWithUserToken(userToken) }
  );
}

// In main sync function:
if (account.account_sync_source === 'truelayer') {
  return downloadTrueLayerTransactions(
    acctId,
    accountId,
    bankId,
    startDate,
    endDate
  );
}
```

---

## Phase 6: Frontend Integration (Minimal for Now)

### 6.1 Authorization Function

**File**: `packages/desktop-client/src/truelayer.ts` (new file)

```typescript
import { type AppDispatch } from './redux';
import { pushModal } from './modals/modalsSlice';

export async function authorizeTrueLayer(dispatch: AppDispatch) {
  dispatch(
    pushModal({
      modal: {
        name: 'truelayer-external-msg',
        options: {
          onMoveExternal: async () => {
            // OAuth flow handled by modal
          },
          onClose: () => {
            // Cleanup
          },
          onSuccess: () => {
            // Show account selection
          }
        }
      }
    })
  );
}
```

---

## Implementation Checklist

### ✅ Phase 1 Complete - Backend Infrastructure (Commits: 7c1ad7f → 181471a56)

**Backend Foundation:**
- [x] Create `app-truelayer/` directory structure (fe7b49f)
- [x] Implement `truelayer-service.js` with OAuth methods (64a9c3e)
- [x] Add error classes (6 custom error types) (fe7b49f)
- [x] Add secrets to `secrets-service.js` (7c1ad7f)
- [x] Update server config (TRUELAYER_SERVER endpoint) (7c1ad7f)
- [x] Create `link.html` OAuth callback page (fe7b49f)

**Types:**
- [x] Create `truelayer.ts` type definitions (4eab4e3)
- [x] Update `BankSyncProviders` union (7c1ad7f)
- [x] Export types from `index.ts` (4eab4e3)

**Express Router:**
- [x] Create Express routes in `app-truelayer.js` (297560a)
- [x] Register routes in `app.ts` (77561162d)
- [x] Implement 7 HTTP endpoints (status, create-web-token, get-accounts, callback, transactions, refresh-token, link)

**RPC Handlers:**
- [x] Implement `trueLayerStatus()` (5830c94c7)
- [x] Implement `createTrueLayerWebToken()` (5830c94c7)
- [x] Implement `pollTrueLayerWebToken()` (5830c94c7)
- [x] Implement `stopTrueLayerWebTokenPolling()` (5830c94c7)
- [x] Implement `linkTrueLayerAccount()` (5830c94c7)
- [x] Register all RPC methods (5830c94c7)

**Sync Logic:**
- [x] Add TrueLayer case to `sync.ts` (181471a56)
- [x] Implement `downloadTrueLayerTransactions()` (181471a56)

**Testing:**
- [x] All loot-core tests passing
- [x] All sync-server tests passing
- [x] TypeScript compilation successful

### ✅ Phase 2 - Frontend Integration (100% Complete)

**Frontend Components:**
- [x] Create useTrueLayerStatus hook
- [x] Create authorizeBank helper function
- [x] Create TrueLayerInitialiseModal component
- [x] Create TrueLayerExternalMsgModal component
- [x] Create TrueLayerLink component
- [x] Register modals in Modals.tsx
- [x] Add TrueLayer to CreateAccountModal
- [x] Update BankSync component
- [x] Add linkAccountTrueLayer to accountsSlice
- [x] Update SelectLinkedAccountsModal for TrueLayer
- [x] Add modal type definitions to modalsSlice
- [x] Run and verify all tests pass

---

## Testing Strategy

1. **Local OAuth Testing**
   - Set up ngrok/localhost tunnel for OAuth redirect
   - Test authorization flow end-to-end
   - Verify token storage and refresh

2. **API Integration Testing**
   - Test with TrueLayer sandbox environment
   - Verify account fetching
   - Verify transaction normalization

3. **Error Handling**
   - Test expired tokens
   - Test invalid credentials
   - Test network failures

4. **End-to-End Flow**
   - Link account from fresh state
   - Sync transactions
   - Verify data in Actual Budget UI

---

## Key Differences from GoCardless

1. **No Requisition ID** - TrueLayer uses direct account IDs
2. **Different Token Lifecycle** - 1 hour access tokens vs 24 hour
3. **No Institution Selection in Backend** - Users select bank in TrueLayer's OAuth UI
4. **Provider Data Structure** - Simpler than GoCardless's detailed institution data

---

## Next Steps

1. Start with Phase 1: Backend infrastructure
2. Test OAuth flow in isolation
3. Add RPC handlers
4. Integrate with sync logic
5. Add minimal frontend (defer full UI until backend working)
6. Test end-to-end with real TrueLayer account

This plan is based on proven patterns in the codebase and should result in a clean, maintainable implementation.
