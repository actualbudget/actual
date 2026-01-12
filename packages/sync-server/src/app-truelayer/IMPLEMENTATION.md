# TrueLayer Integration - Implementation Documentation

**Status**: ✅ Complete and Production-Ready
**Branch**: `feat/truelayer-bank-sync`
**Pattern**: GoCardless OAuth-based flow

---

## Overview

This document describes the complete implementation of TrueLayer bank sync integration for Actual Budget. The implementation follows the established GoCardless pattern for OAuth-based bank connections.

### Key Features

- ✅ OAuth 2.0 authorization flow with UK banks
- ✅ Persistent token storage with automatic refresh
- ✅ Transaction syncing with smart payee name resolution
- ✅ Accurate starting balance calculation
- ✅ Extended transaction history on first sync (up to 2 years, bank-dependent)
- ✅ Clean error handling and user feedback

---

## Architecture

```
User → Frontend Modals → RPC Handlers → Sync Server → TrueLayer API
                                ↓
                         Token Storage (Persistent)
                                ↓
                         Transaction Sync
```

### OAuth Flow

```
1. User clicks "Link TrueLayer Account"
2. Frontend opens TrueLayerExternalMsgModal
3. Backend creates OAuth URL with authId
4. User redirected to TrueLayer's bank selection
5. User authorizes at their bank
6. TrueLayer redirects back to /truelayer/callback
7. Backend exchanges code for access + refresh tokens
8. Tokens stored persistently in secretsService
9. Accounts fetched and displayed for selection
10. User selects accounts to link
11. Initial sync pulls transactions + calculates starting balance
```

---

## Implementation Details

### Phase 1: Backend Infrastructure

#### 1.1 Service Layer

**File**: `packages/sync-server/src/app-truelayer/services/truelayer-service.js`

**Key Functions**:

```javascript
// Configuration Check
isConfigured()
  → Checks if clientId and clientSecret are set in secretsService

// OAuth Flow
createAuthLink({ host })
  → Generates UUID for authId (CSRF protection)
  → Stores session in authSessions Map
  → Builds TrueLayer OAuth URL with correct redirect_uri
  → Returns { link, authId }

handleCallback(authId, code, error)
  → Validates session exists
  → Exchanges authorization code for tokens
  → Fetches account list from TrueLayer API
  → Stores tokens BOTH in-memory AND persistently
  → Returns { accounts, tokens }

// Token Management
getAccessTokenForAccount(accountId)
  → First checks in-memory accountAuthMapping
  → Falls back to secretsService for persistence
  → Auto-refreshes if token expires within 5 minutes
  → Returns fresh access_token

refreshAccessToken(refreshToken)
  → POSTs to TrueLayer token endpoint
  → Returns new access_token and refresh_token

// API Calls
getAccounts(accessToken)
  → GETs /data/v1/accounts
  → Normalizes to Actual Budget format

getBalance(accessToken, accountId)
  → GETs /data/v1/accounts/{id}/balance
  → Returns current and available balance

getTransactions(accessToken, accountId, startDate, endDate)
  → GETs /data/v1/accounts/{id}/transactions
  → Normalizes transactions with smart payee names
```

**Token Persistence Strategy**:

```javascript
// When linking account (handleCallback):
for (const account of accounts) {
  const tokenKey = `truelayer_token_${account.account_id}`;
  secretsService.set(tokenKey, JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    token_type: tokens.token_type,
    saved_at: Date.now()
  }));
}

// When retrieving token (getAccessTokenForAccount):
// 1. Check in-memory Map first (fast path)
// 2. Fall back to secretsService (survives restarts)
// 3. Auto-refresh if expires_in < 5 minutes
```

**Payee Name Resolution**:

```javascript
// Priority order for best merchant names:
const payeeName = tx.meta?.provider_merchant_name  // Cleanest (e.g., "Amazon")
  || tx.merchant_name                              // Sometimes available
  || tx.description;                               // Fallback

// provider_merchant_name gives better names:
// "Amazon" instead of "AMAZON* ABC1212341"
// "Tesco" instead of "TESCO STORES 9988"
// "Acme Corporation" instead of "JOHN SMITH"
```

#### 1.2 Express Routes

**File**: `packages/sync-server/src/app-truelayer/app-truelayer.js`

**Route Order (Important)**:

```javascript
// 1. Static file serving (no auth required)
GET /truelayer/link
  → Serves link.html for OAuth callback window

// 2. OAuth callback (BEFORE authentication middleware)
GET /truelayer/callback
  → Receives OAuth code from TrueLayer
  → No X-ACTUAL-TOKEN header present
  → Calls handleCallback to process
  → Redirects to /link with success/error

// 3. Authenticated routes (AFTER middleware)
POST /truelayer/status
POST /truelayer/create-web-token
POST /truelayer/get-accounts
POST /truelayer/transactions
POST /truelayer/refresh-token
```

**Critical Fix**: Callback route MUST be defined before `validateSessionMiddleware` because TrueLayer's redirect doesn't include user tokens.

**Starting Balance Calculation**:

```javascript
POST /truelayer/transactions
  → Fetches transactions AND current balance in parallel
  → Two methods for calculation:

  // Method 1: If running_balance is available (some banks)
  if (oldestTransaction.balanceAfterTransaction) {
    startingBalance = balanceAfter - transactionAmount;
  }

  // Method 2: Calculate from current balance (most banks)
  else if (balance.current) {
    let calculatedBalance = balance.current * 100; // to cents
    for (transaction of transactions) {
      calculatedBalance -= transaction.amount * 100;
    }
    startingBalance = calculatedBalance;
  }
```

#### 1.3 Error Handling

**File**: `packages/sync-server/src/app-truelayer/errors.js`

Custom error classes for specific scenarios:

```javascript
InvalidTrueLayerTokenError → 401 from TrueLayer API
AuthorizationNotLinkedError → OAuth not completed yet (polling continues)
AccessDeniedError → User denied authorization
NotFoundError → Account/session not found
RateLimitError → Too many requests
ServiceError → Generic TrueLayer API error
```

### Phase 2: Type Definitions

**File**: `packages/loot-core/src/types/models/truelayer.ts`

```typescript
export type TrueLayerAuthSession = {
  authId: string;
  link?: string;
  accounts?: SyncServerTrueLayerAccount[];  // Optional for polling response
};

export type SyncServerTrueLayerAccount = {
  balance: number;
  account_id: string;
  institution?: string;
  name: string;
  type?: string;
  official_name?: string;
  mask?: string;  // Last 4 digits of account number
};
```

**File**: `packages/loot-core/src/types/models/bank-sync.ts`

```typescript
export type BankSyncProviders =
  | 'goCardless'
  | 'simpleFin'
  | 'pluggyai'
  | 'truelayer';  // Added
```

### Phase 3: RPC Handlers

**File**: `packages/loot-core/src/server/accounts/app.ts`

```typescript
// Status check
trueLayerStatus()
  → POSTs to /truelayer/status
  → Returns { configured: boolean }

// OAuth initiation
createTrueLayerWebToken()
  → POSTs to /truelayer/create-web-token
  → Returns { link, authId }

// Polling for OAuth completion
pollTrueLayerWebToken({ authId })
  → Polls /truelayer/get-accounts every 3 seconds
  → Continues on AuthorizationNotLinkedError
  → Resolves when accounts received
  → 10-minute timeout

stopTrueLayerWebTokenPolling()
  → Clears polling interval

// Account linking
linkTrueLayerAccount({ authId, account, upgradingId, offBudget })
  → Creates/updates bank record with authId as bank_id
  → Creates/updates account record
  → Triggers initial sync
  → Returns account id
```

### Phase 4: Transaction Sync Integration

**File**: `packages/loot-core/src/server/accounts/sync.ts`

```typescript
async function downloadTrueLayerTransactions(
  acctId: AccountEntity['id'],
  since: string,
  isNewAccount: boolean  // Added in Phase 3
) {
  // For new accounts, request extended history
  let startDate = since;
  if (isNewAccount) {
    const twoYearsAgo = monthUtils.subDays(monthUtils.currentDay(), 730);
    startDate = twoYearsAgo;
    logger.log(`New account detected, requesting extended history from ${startDate}`);
  }

  return post(
    getServer().TRUELAYER_SERVER + '/transactions',
    { accountId: acctId, startDate },
    { 'X-ACTUAL-TOKEN': userToken }
  );
}

// Sync logic integration
if (acctRow.account_sync_source === 'truelayer') {
  download = await downloadTrueLayerTransactions(
    acctId,
    syncStartDate,
    newAccount  // Passed to request extended history
  );
}
```

**Extended History Logic**:

- First sync: Request 730 days (2 years) of history
- Subsequent syncs: Use standard 90-day lookback
- Bank determines actual history returned (SCA limitations)
- Most UK banks limit to 90 days due to regulations

### Phase 5: Frontend Integration

#### 5.1 Authorization Helper

**File**: `packages/desktop-client/src/truelayer.ts`

```typescript
export async function authorizeBank(dispatch: AppDispatch) {
  _authorize(dispatch, {
    onSuccess: async data => {
      // Open account selection modal with fetched accounts
      dispatch(pushModal({
        modal: {
          name: 'select-linked-accounts',
          options: {
            externalAccounts: data.accounts,
            authId: data.authId,
            syncSource: 'truelayer',
          },
        },
      }));
    },
  });
}
```

#### 5.2 Modal Components

**TrueLayerInitialiseModal**: Collects client ID and secret from user
**TrueLayerExternalMsgModal**: Handles OAuth flow and polling
**TrueLayerLink**: OAuth callback window (automatically closes)

**Registration** in `Modals.tsx`:

```typescript
case 'truelayer-init':
  return <TrueLayerInitialiseModal {...modal.options} />;
case 'truelayer-external-msg':
  return <TrueLayerExternalMsgModal {...modal.options} />;
```

#### 5.3 UI Integration

**CreateAccountModal**: Added TrueLayer option for UK bank accounts
**BankSync Component**: Displays "TrueLayer" for linked accounts
**SelectLinkedAccountsModal**: Updated to handle TrueLayer accounts

---

## Testing & Bug Fixes

### Listing mistakes to help others to learn from them

#### 1. Port Configuration

**Issue**: Used `req.headers.origin` (frontend port 3001) instead of sync server port (5006)
**Impact**: OAuth redirect pointed to wrong server
**Fix**: Changed to `req.get('host')` to use sync server's actual host:port

```javascript
const protocol = req.protocol || 'http';
const host = req.get('host');  // e.g., 'localhost:5006'
const serverUrl = `${protocol}://${host}`;
```

#### 2. Callback Authentication Bypass

**Issue**: `/callback` route required authentication, but OAuth redirects don't include tokens
**Impact**: 401 Unauthorized on callback
**Fix**: Moved callback route definition BEFORE `validateSessionMiddleware`

#### 3. Missing AuthId in Response

**Issue**: Frontend expected `data.authId` but only `accounts` was returned
**Impact**: SQL error "Invalid field type undefined" when linking
**Fix**: Added authId to `/get-accounts` response payload

#### 4. Token Persistence

**Issue**: Tokens stored in-memory Maps were lost on server restart
**Impact**: "not-found" error when syncing after restart
**Fix**: Dual storage strategy:
- In-memory for fast access during session
- secretsService for persistence across restarts
- Auto-refresh when token expires

#### 5. Payee Name Quality

**Issue**: Raw descriptions like "P*7285734930229" instead of "EBAY Commerce UK Ltd"
**Impact**: Poor user experience with unclear transaction names
**Fix**: Prioritize `meta.provider_merchant_name` over `merchant_name`:

```javascript
const payeeName = tx.meta?.provider_merchant_name  // Best
  || tx.merchant_name
  || tx.description;  // Fallback
```

#### 6. Transaction History Limit

**Issue**: Only 90 days of history on first sync
**Impact**: Users missing historical transactions
**Fix**: Request 2 years on `newAccount === true`, bank returns what it can according to SCA rules

#### 7. Starting Balance Calculation

**Issue**: Starting balance was always 0
**Root Cause**: `running_balance` field is optional (not provided by all banks)
**Fix**: Dual-method calculation:
1. Use `running_balance` if available
2. Otherwise: `currentBalance - sum(all transactions)`

---

## API Endpoints

### TrueLayer API Endpoints Used

```
Authentication:
POST https://auth.truelayer.com/connect/token
  → Exchange authorization code for tokens
  → Refresh access token using refresh token

Data API:
GET https://api.truelayer.com/data/v1/accounts
  → List user's bank accounts

GET https://api.truelayer.com/data/v1/accounts/{id}/balance
  → Get current account balance

GET https://api.truelayer.com/data/v1/accounts/{id}/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD
  → Get account transactions
```

### Actual Budget Sync Server Endpoints

```
GET  /truelayer/link
POST /truelayer/status
POST /truelayer/create-web-token
POST /truelayer/get-accounts
GET  /truelayer/callback
POST /truelayer/transactions
POST /truelayer/refresh-token
```

---

## Configuration

### Required Secrets

```javascript
truelayer_clientId: 'your-client-id'
truelayer_clientSecret: 'your-client-secret'
```

### OAuth Scopes

```
info accounts balance transactions offline_access
```

### Token Lifecycle

- **Access Token**: 1 hour expiration
- **Refresh Token**: Long-lived (typically 90 days)
- **Auto-refresh**: When expires_in < 5 minutes

---

## Testing Checklist

- [x] Unit tests pass (loot-core, sync-server, web)
- [x] TypeScript compilation successful
- [x] OAuth flow completes successfully
- [x] Account linking creates database records correctly
- [x] Transactions sync with correct payee names
- [x] Starting balance calculated accurately
- [x] Token persistence works across server restarts
- [x] Token auto-refresh prevents expired token errors
- [x] Extended history requested on first sync
- [x] Error handling provides clear user feedback

---

## Known Limitations

1. **90-Day History Limit**: Due to SCA regulations, most UK banks only provide 90 days of transaction history
2. **No running_balance**: Some banks don't provide running balance, requiring calculation from current balance
3. **Token Expiry**: Access tokens expire after 1 hour, requiring refresh mechanism
4. **OAuth Redirect**: Requires publicly accessible URL for production use

---

## Comparison with GoCardless

| Feature | GoCardless | TrueLayer |
|---------|-----------|-----------|
| Authorization | OAuth 2.0 | OAuth 2.0 |
| Token Lifetime | 24 hours | 1 hour |
| Requisition ID | Yes | No (uses authId) |
| Institution Selection | In app | In TrueLayer UI |
| History Limit | 90 days (bank-dependent) | 90 days (bank-dependent) |
| Refresh Token | Yes | Yes |
| Balance API | Yes | Yes |

---

## Production Deployment

### Prerequisites

1. TrueLayer account with approved application
2. Production client ID and secret
3. Registered redirect URI (must be HTTPS)
4. Server accessible at redirect URI domain

### Setup Steps

1. Set secrets in Actual Budget:
   ```
   truelayer_clientId: <production-client-id>
   truelayer_clientSecret: <production-client-secret>
   ```

2. Configure TrueLayer Console:
   - Add redirect URI: `https://your-domain.com/truelayer/callback`
   - Enable required scopes
   - Set to production mode

3. Test OAuth flow with real bank account

---

## Maintenance

### Periodic Tasks

- Monitor token refresh success rate
- Check for TrueLayer API changes
- Review error logs for failed syncs

### Common Issues

**"Invalid redirect_uri"**: Check TrueLayer Console configuration matches server URL
**"not-found" on sync**: Token may be expired, try relinking account
**Missing transactions**: Bank may limit history, normal for SCA compliance
**Empty payee names**: Normal for some transaction types, uses description as fallback

---

## References

- [TrueLayer API Documentation](https://docs.truelayer.com/)
- [TrueLayer OAuth Guide](https://docs.truelayer.com/docs/data-api-basics)
- [GoCardless Integration Pattern](https://github.com/actualbudget/actual/tree/master/packages/sync-server/src/app-gocardless)
- [truelayer2firefly Reference Implementation](https://github.com/erwindouna/truelayer2firefly)

---
