# Enable Banking Integration - Clean Branch Migration Guide

This guide provides a complete checklist for recreating the Enable Banking integration on a fresh branch from origin/master.

## Prerequisites

1. Create new branch from origin/master:
   ```bash
   git fetch origin
   git checkout -b feature/enable-banking-integration-clean origin/master
   ```

2. Ensure you have access to the original branch files for reference

---

## PART 1: NEW FILES TO COPY (23 files)

Copy these complete files from the original branch:

### Desktop Client (7 files)

1. **packages/desktop-client/src/banksync/enablebanking.ts**
   - Enable Banking authorization flow

2. **packages/desktop-client/src/components/EnableBankingCallback.tsx**
   - OAuth callback handler component

3. **packages/desktop-client/src/components/modals/EnableBankingInitialiseModal.tsx**
   - Modal for initial Enable Banking setup

4. **packages/desktop-client/src/components/modals/EnableBankingSetupAccountModal.tsx**
   - Modal for bank selection and setup

5. **packages/desktop-client/src/hooks/useEnableBankingStatus.ts**
   - Hook for Enable Banking configuration status

### Loot Core (2 files)

6. **packages/loot-core/src/server/accounts/enablebanking.ts**
   - Server-side Enable Banking account handlers

7. **packages/loot-core/src/types/models/enablebanking.ts**
   - TypeScript type definitions for Enable Banking

### Sync Server (16 files)

8. **packages/sync-server/src/app-enablebanking/app-enablebanking.ts**
   - Main Enable Banking Express router

**Banks:**
9. **packages/sync-server/src/app-enablebanking/banks/abnamro.bank.ts**
10. **packages/sync-server/src/app-enablebanking/banks/bank-registry.ts**
11. **packages/sync-server/src/app-enablebanking/banks/danish.bank.ts**
12. **packages/sync-server/src/app-enablebanking/banks/fallback.bank.ts**
13. **packages/sync-server/src/app-enablebanking/banks/rabobank.bank.ts**
14. **packages/sync-server/src/app-enablebanking/banks/utils.ts**

15. **packages/sync-server/src/app-enablebanking/link.html**
    - OAuth callback HTML page

**Models:**
16. **packages/sync-server/src/app-enablebanking/models/bank-processor.ts**
17. **packages/sync-server/src/app-enablebanking/models/enablebanking-openapi.ts**
18. **packages/sync-server/src/app-enablebanking/models/enablebanking.ts**

**Services:**
19. **packages/sync-server/src/app-enablebanking/services/enablebanking-services.ts**

**Utils:**
20. **packages/sync-server/src/app-enablebanking/utils/errors.ts**
21. **packages/sync-server/src/app-enablebanking/utils/jwt.ts**

**Tests:**
22. **packages/sync-server/src/app-enablebanking/tests/errors.spec.ts**
23. **packages/sync-server/src/app-enablebanking/tests/utils.spec.ts**

### Documentation

24. **upcoming-release-notes/5570.md**
    - Release notes for Enable Banking feature

---

## PART 2: PACKAGE DEPENDENCIES

### packages/sync-server/package.json

Add these dependencies:

```json
"dependencies": {
  "fast-glob": "^3.3.3",
  "openapi-fetch": "^0.14.0"
}

"devDependencies": {
  "@types/jws": "^3.2.10"
}
```

---

## PART 3: EXISTING FILES TO MODIFY


### 1. packages/desktop-client/src/accounts/accountsSlice.ts

**Location:** After line 256

**Add syncSource parameter to LinkAccountPayload:**
```typescript
type LinkAccountPayload = LinkAccountBasePayload & {
  requisitionId: string;
  account: SyncServerGoCardlessAccount;
  syncSource?: 'goCardless' | 'enableBanking';  // ← ADD THIS LINE
};
```

**Location:** In linkAccount function, after line 266

**Add syncSource to destructuring and pass to backend:**
```typescript
export const linkAccount = createAppAsyncThunk(
  `${sliceName}/linkAccount`,
  async (
    {
      requisitionId,
      account,
      upgradingId,
      offBudget,
      syncSource,  // ← ADD THIS
      startingDate,
      startingBalance,
    }: LinkAccountPayload,
    { dispatch },
  ) => {
    if (syncSource === undefined) {  // ← ADD THESE 3 LINES
      syncSource = 'goCardless';
    }
    await send('gocardless-accounts-link', {
      requisitionId,
      account,
      upgradingId,
      offBudget,
      syncSource,  // ← ADD THIS
      startingDate,
      startingBalance,
    });
```

---

### 2. packages/desktop-client/src/components/Modals.tsx

**Location:** After imports section (around line 30)

**Add imports:**
```typescript
import { EnableBankingInitialiseModal } from './modals/EnableBankingInitialiseModal';
import { EnableBankingSetupAccountModal } from './modals/EnableBankingSetupAccountModal';
```

**Location:** In Modals component, after 'simplefin-init' case (around line 181)

**Add modal cases:**
```typescript
        case 'enablebanking-init':
          return <EnableBankingInitialiseModal key={key} {...modal.options} />;

        case 'enablebanking-setup-account':
          return (
            <EnableBankingSetupAccountModal key={key} {...modal.options} />
          );
```

---

### 3. packages/desktop-client/src/modals/modalsSlice.ts

**Location:** After imports (around line 19)

**Add import:**
```typescript
import { type EnableBankingToken } from 'loot-core/types/models/enablebanking';
```

**Location:** In Modal type union, after 'simplefin-init' (around line 106)

**Add modal types:**
```typescript
  | {
      name: 'enablebanking-init';
      options: {
        onSuccess: (close: () => void) => void;
      };
    }
  | {
      name: 'enablebanking-setup-account';
      options: {
        onSuccess: (data: EnableBankingToken) => Promise<void>;
        initialCountry?: string;
        initialAspsp?: string;
      };
    }
```

---

### 4. packages/desktop-client/src/components/FinancesApp.tsx

**Location:** After '/gocardless/link' route (around line 321)

**Add route:**
```typescript
                <Route
                  path="/enablebanking/auth_callback"
                  element={
                    <NarrowNotSupported>
                      <WideComponent name="EnableBankingCallback" />
                    </NarrowNotSupported>
                  }
                />
```

---

### 5. packages/desktop-client/src/components/responsive/wide.ts

**Location:** After GoCardlessLink export (around line 6)

**Add export:**
```typescript
export { EnableBankingCallback } from '../EnableBankingCallback';
```

---

### 6. packages/desktop-client/src/components/modals/SelectLinkedAccountsModal.tsx

**Location:** In SelectLinkedAccountsModalProps type

**Update requisition/authorization ID types to support both:**
```typescript
type SelectLinkedAccountsModalProps = {
  externalAccounts: SyncServerGoCardlessAccount[];
  requisitionId?: string;  // ← Make optional if not already
  authorizationId?: string;  // ← ADD THIS for Enable Banking
  syncSource: 'goCardless' | 'enableBanking';  // ← ADD THIS
};
```

**Location:** In the component body where requisitionId is used

**Update to use authorizationId for Enable Banking:**
```typescript
  const handleLinkedAccountAdd = useCallback(
    async (externalAccount: SyncServerGoCardlessAccount) => {
      dispatch(setAccountsSyncing({ ids: [externalAccount.id] }));

      const res = await dispatch(
        linkAccount({
          requisitionId: syncSource === 'goCardless' ? requisitionId : authorizationId,  // ← UPDATE
          account: externalAccount,
          syncSource,  // ← ADD THIS
          upgradingId,
          offBudget,
        }),
      );
```

---

### 7. packages/desktop-client/src/components/modals/CreateAccountModal.tsx

**Location:** In imports section (around line 20)

**Add imports:**
```typescript
import {
  authorizeEnableBankingSession,
  deconfigureEnableBanking,
} from '@desktop-client/banksync/enablebanking';
```

**Location:** In the component, add Enable Banking configuration section

Find the bank sync configuration section and add Enable Banking alongside GoCardless/SimpleFin.
Look for where other bank sync providers are configured and add similar Enable Banking setup.

---

### 8. packages/desktop-client/src/components/accounts/AccountSyncCheck.tsx

**Location:** In imports (around line 14)

**Add import:**
```typescript
import { authorizeEnableBankingSession } from '@desktop-client/banksync/enablebanking';
```

**Location:** In the component where reauth buttons are rendered

**Add Enable Banking reauth handling** similar to GoCardless/SimpleFin pattern.

---

### 9. packages/desktop-client/src/components/banksync/index.tsx

**Location:** In useSyncSourceReadable hook (around line 32)

**Add to readable names:**
```typescript
  const syncSourceReadable = {
    goCardless: 'GoCardless',
    simpleFin: 'SimpleFIN',
    pluggyai: 'Pluggy.ai',
    enablebanking: 'Enable Banking',  // ← ADD THIS
    unlinked: t('Unlinked'),
  };
```

---

### 10. packages/desktop-client/src/components/mobile/banksync/MobileBankSyncPage.tsx

**Location:** In useSyncSourceReadable hook (around line 31)

**Add to readable names:**
```typescript
  const syncSourceReadable = {
    goCardless: 'GoCardless',
    simpleFin: 'SimpleFIN',
    pluggyai: 'Pluggy.ai',
    enablebanking: 'Enable Banking',  // ← ADD THIS
    unlinked: t('Unlinked'),
  };
```

---


## PART 4: LOOT-CORE MODIFICATIONS

### 11. packages/loot-core/src/server/accounts/app.ts

**Location:** In imports section (after other imports, around line 37)

**Add Enable Banking imports:**
```typescript
import {
  app as enableBankingApp,
  type AccountHandlers as EnableBankingAccountHandlers,
} from './enablebanking';
```

**Location:** In AccountHandlers type (around line 58)

**Add handlers:**
```typescript
export type AccountHandlers = {
  'accounts-get': typeof getAccounts;
  'account-balance': typeof getAccountBalance;
  'account-properties': typeof getAccountProperties;
  'get-bank': typeof getBank;  // ← ADD THIS
  'gocardless-accounts-link': typeof linkGoCardlessAccount;
  'simplefin-accounts-link': typeof linkSimpleFinAccount;
  'pluggyai-accounts-link': typeof linkPluggyAiAccount;
  // ... other handlers ...
} & EnableBankingAccountHandlers;  // ← ADD THIS
```

**Location:** After getAccountProperties function (around line 130)

**Add getBank function:**
```typescript
async function getBank({ id }: { id: string }) {
  return await db.first<db.DbBank>(
    'SELECT * FROM banks WHERE id = ? AND tombstone = 0',
    [id],
  );
}
```

**Location:** In linkGoCardlessAccount function signature (around line 138)

**Update function to support syncSource:**
```typescript
async function linkGoCardlessAccount({
  requisitionId,
  account,
  upgradingId,
  offBudget = false,
  syncSource = 'goCardless',  // ← ADD THIS
  startingDate,
  startingBalance,
}: LinkAccountBaseParams & {
  requisitionId: string;
  account: SyncServerGoCardlessAccount;
  syncSource?: 'goCardless' | 'enableBanking';  // ← ADD THIS
}) {
  let id;
  const institution =
    typeof account.institution === 'string'
      ? { name: account.institution }
      : account.institution;  // ← ADD THESE 3 LINES to support object
  const bank = await link.findOrCreateBank(institution, requisitionId);

  if (upgradingId) {
    // ... existing code ...
    await db.update('accounts', {
      id,
      account_id: account.account_id,
      bank: bank.id,
      official_name: account.official_name,
      account_sync_source: syncSource,  // ← CHANGE from 'goCardless' to syncSource
    });
  } else {
    // ... existing code ...
    await db.insertWithUUID('accounts', {
      id,
      name: account.name,
      account_id: account.account_id,
      official_name: account.official_name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: syncSource,  // ← CHANGE from 'goCardless' to syncSource
    });
    // ... rest of function ...
  }
```

**Location:** At bottom of file, in handlers export (around line 1200+)

**Add Enable Banking handlers:**
```typescript
export const handlers = {
  // ... existing handlers ...
  'get-bank': getBank,
  ...enableBankingApp,  // ← ADD THIS to spread Enable Banking handlers
};
```

---

### 12. packages/loot-core/src/server/accounts/link.ts

**Location:** findOrCreateBank function signature (line 6)

**Add TypeScript types:**
```typescript
export async function findOrCreateBank(
  institution: { name: string },  // ← ADD TYPE
  requisitionId: string,           // ← ADD TYPE
) {
```

---

### 13. packages/loot-core/src/server/accounts/sync.ts

**Location:** In imports section (around line 37)

**Add import:**
```typescript
import { downloadEnableBankingTransactions } from './enablebanking';
```

**Location:** In getAccountSyncStartDate function (around line 93)

**Update sync date window:**
```typescript
async function getAccountSyncStartDate(id) {
  // Bank sync providers may support different historical data windows depending on the institution.
  // Request up to 1 year of data - the provider will return what the bank supports.
  const dates = [monthUtils.subDays(monthUtils.currentDay(), 365)];  // ← CHANGE from 90 to 365
```

**Location:** In processBankSyncDownload, balance calculation section (around line 945)

**Add Enable Banking to balance calculation:**
```typescript
    } else if (
      acctRow.account_sync_source === 'pluggyai' ||
      acctRow.account_sync_source === 'enableBanking'  // ← ADD THIS
    ) {
      const currentBalance = download.startingBalance;
      // ... rest of logic
    }
```

**Location:** In syncAccount function (around line 1050)

**Add Enable Banking download handler:**
```typescript
  } else if (acctRow.account_sync_source === 'goCardless') {
    download = await downloadGoCardlessTransactions(
      acctId,
      syncStartDate,
      newAccount,
    );
  } else if (acctRow.account_sync_source === 'enableBanking') {  // ← ADD THIS WHOLE BLOCK
    download = await downloadEnableBankingTransactions(
      acctId,
      syncStartDate,
      bankId,
    );
  } else {
    throw new Error(
      `Unrecognized bank-sync provider: ${acctRow.account_sync_source}`,
    );
  }
```

---

### 14. packages/loot-core/src/types/models/account.ts

**Location:** AccountSyncSource type definition (line 25)

**Add 'enablebanking':**
```typescript
export type AccountSyncSource =
  | 'simpleFin'
  | 'goCardless'
  | 'pluggyai'
  | 'enablebanking';  // ← ADD THIS
```

---

### 15. packages/loot-core/src/types/models/bank-sync.ts

**Location:** BankSyncProviders type definition (line 23)

**Add 'enablebanking':**
```typescript
export type BankSyncProviders =
  | 'goCardless'
  | 'simpleFin'
  | 'pluggyai'
  | 'enablebanking';  // ← ADD THIS
```

---

### 16. packages/loot-core/src/server/server-config.ts

**Location:** In getConfig function, featureFlags section

Check if Enable Banking feature flag needs to be added. This may depend on how the feature flags are structured in the current master.

---

## PART 5: SYNC SERVER MODIFICATIONS

### 17. packages/sync-server/src/app.ts

**Location:** In imports section (around line 13)

**Add Enable Banking import:**
```typescript
import * as enablebankingApp from './app-enablebanking/app-enablebanking';
```

**Location:** In Express route mounting section (around line 73)

**Add route:**
```typescript
app.use('/gocardless', goCardlessApp.handlers);
app.use('/simplefin', simpleFinApp.handlers);
app.use('/pluggyai', pluggai.handlers);
app.use('/enablebanking', enablebankingApp.handlers);  // ← ADD THIS
app.use('/secret', secretApp.handlers);
```

---

### 18. packages/sync-server/src/services/secrets-service.js

**Location:** In SecretName object (around line 17)

**Add Enable Banking secrets:**
```typescript
export const SecretName = {
  // ... existing secrets ...
  pluggyai_clientId: 'pluggyai_clientId',
  pluggyai_clientSecret: 'pluggyai_clientSecret',
  pluggyai_itemIds: 'pluggyai_itemIds',
  enablebanking_applicationId: 'enablebanking_applicationId',  // ← ADD THIS
  enablebanking_secret: 'enablebanking_secret',                 // ← ADD THIS
};
```

---

### 19. packages/desktop-client/vite.config.mts

**Note:** Check if any configuration changes are needed for the /enablebanking route proxy in development mode. This may already be covered by existing proxy rules.

---

## PART 6: YARN LOCK

**Action:** After adding all files and running `yarn install`, the yarn.lock will be automatically updated with:
- fast-glob
- openapi-fetch
- @types/jws
- And their transitive dependencies

**Command:**
```bash
yarn install
```

---

## PART 7: VERIFICATION CHECKLIST

After applying all changes, verify:

- [ ] All 24 new files copied
- [ ] All package.json dependencies added
- [ ] All 19 existing files modified correctly
- [ ] Run `yarn install` successfully
- [ ] Run `yarn typecheck` - no errors
- [ ] Run `yarn lint:fix` - no errors
- [ ] Run `yarn test` - all tests pass
- [ ] Run `yarn build:browser` - builds successfully
- [ ] Run `yarn build:server` - builds successfully
- [ ] Start dev server: `yarn start:server-dev` - no errors
- [ ] Enable Banking routes accessible at `/enablebanking/*`
- [ ] Enable Banking modals render correctly
- [ ] OAuth flow can be initiated (if credentials configured)

---

## PART 8: TESTING ENABLE BANKING

### Prerequisites for testing:
1. Enable Banking API credentials (applicationId and secret)
2. Configure secrets via admin panel or server

### Manual test flow:
1. Open Create Account modal
2. Select "Link Bank Account"
3. Choose Enable Banking option
4. Select country and bank (ASPSP)
5. Complete OAuth flow
6. Select accounts to link
7. Verify accounts are created with `account_sync_source = 'enablebanking'`
8. Trigger bank sync
9. Verify transactions are downloaded

---

## PART 9: CREATING THE NEW PR

After all changes are complete and tested:

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "feat: Integrate Enable Banking for European bank sync

- Add Enable Banking integration supporting European PSD2 banks
- Support GoCardless-compatible interface with syncSource parameter
- Add bank-specific processors for ABN AMRO, Rabobank, Danish banks
- Add OAuth2 authorization flow and session management
- Add admin endpoints for session management
- Include comprehensive tests for bank processors and services

Closes #XXXX"

# Push to your fork
git push -u origin feature/enable-banking-integration-clean

# Create PR via GitHub UI or gh CLI:
gh pr create --title "[WIP] Integrate Enable Banking for Bank Sync" \
  --body "Clean implementation of Enable Banking integration for European banks"
```

---

## NOTES

### Key Architecture Decisions:
1. **Reuses GoCardless account linking** - Enable Banking uses the same account structure
2. **syncSource parameter** - Discriminates between 'goCardless' and 'enableBanking'
3. **Bank-specific processors** - Handle institution-specific quirks (ABN AMRO PSUs, Danish bank formats)
4. **OpenAPI client** - Uses openapi-fetch for type-safe Enable Banking API calls
5. **JWT authentication** - Handle Bearer tokens and session management
6. **1-year sync window** - Changed from 90 days to support more transaction history

### Common Issues:
- **Import paths**: Ensure `@desktop-client/*` aliases work
- **TypeScript types**: Some types are shared between packages
- **Secrets**: Must configure Enable Banking API credentials before testing
- **CORS**: Enable Banking callback must be whitelisted in API console

