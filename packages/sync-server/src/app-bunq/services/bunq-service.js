import { SecretName, secretsService } from '../../services/secrets-service';
import {
  BunqAuthError,
  BunqConfigurationError,
  BunqInvalidResponseError,
  BunqNotImplementedYetError,
  BunqProtocolError,
  BunqRateLimitError,
  BunqSignatureError,
} from '../errors';

import { BunqClient } from './bunq-client';
import { generateBunqKeyPair, getPublicKeyFromPrivateKey } from './bunq-crypto';

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGES = 20;
const MAX_EVENT_PAGES = 20;
const PAYMENTS_TIME_BUDGET_MS = 20_000;
const EVENTS_TIME_BUDGET_MS = 30_000;
const EVENT_NO_PROGRESS_PAGE_LIMIT = 4;
const EVENT_NO_PROGRESS_MIN_EVENTS_SCANNED = DEFAULT_PAGE_SIZE * 5;

function nowMs() {
  return Date.now();
}

/** @typedef {'sandbox'|'production'} BunqEnvironment */

function getEnvironment() {
  const raw = secretsService.get(SecretName.bunq_environment);
  if (raw === 'production') {
    return 'production';
  }
  return 'production';
}

function getApiKey() {
  return secretsService.get(SecretName.bunq_apiKey);
}

function getPermittedIps() {
  const raw = secretsService.get(SecretName.bunq_permittedIps);
  if (typeof raw !== 'string') {
    return ['*'];
  }

  const permittedIps = raw
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);

  return permittedIps.length > 0 ? permittedIps : ['*'];
}

function getClientPrivateKey() {
  return secretsService.get(SecretName.bunq_clientPrivateKey);
}

function getOrCreateClientPrivateKey() {
  const existingPrivateKey = getClientPrivateKey();
  if (existingPrivateKey) {
    return existingPrivateKey;
  }

  const generated = generateBunqKeyPair();
  secretsService.set(SecretName.bunq_clientPrivateKey, generated.privateKeyPem);
  secretsService.set(SecretName.bunq_clientPublicKey, generated.publicKeyPem);
  return generated.privateKeyPem;
}

function getSessionToken() {
  return secretsService.get(SecretName.bunq_sessionToken);
}

function getInstallationToken() {
  return secretsService.get(SecretName.bunq_installationToken);
}

function getServerPublicKey() {
  return secretsService.get(SecretName.bunq_serverPublicKey);
}

function getUserId() {
  return secretsService.get(SecretName.bunq_userId);
}

/** @param {typeof fetch | undefined} fetchImpl */
function createClient(fetchImpl) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new BunqConfigurationError('bunq_apiKey secret is required');
  }

  return new BunqClient({
    apiKey,
    permittedIps: getPermittedIps(),
    environment: getEnvironment(),
    clientPrivateKey: getClientPrivateKey(),
    installationToken: getInstallationToken(),
    sessionToken: getSessionToken(),
    serverPublicKey: getServerPublicKey(),
    fetchImpl,
    onSessionTokenRefreshed: sessionToken => {
      secretsService.set(SecretName.bunq_sessionToken, sessionToken);
    },
  });
}

/** @param {typeof fetch | undefined} fetchImpl */
async function ensureApiContext(fetchImpl) {
  const privateKey = getOrCreateClientPrivateKey();
  const publicKey = getPublicKeyFromPrivateKey(privateKey);

  let installationToken = getInstallationToken();
  let serverPublicKey = getServerPublicKey();
  let sessionToken = getSessionToken();
  let userId = getUserId();

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new BunqConfigurationError('bunq_apiKey secret is required');
  }

  const permittedIps = getPermittedIps();

  const environment = getEnvironment();

  const resetAuthContext = () => {
    secretsService.set(SecretName.bunq_installationToken, null);
    secretsService.set(SecretName.bunq_serverPublicKey, null);
    secretsService.set(SecretName.bunq_sessionToken, null);
    secretsService.set(SecretName.bunq_userId, null);
  };

  if (!installationToken || !serverPublicKey) {
    const bootstrapClient = new BunqClient({
      apiKey,
      permittedIps,
      environment,
      clientPrivateKey: privateKey,
      fetchImpl,
    });

    const installation = await bootstrapClient.createInstallation(publicKey);
    installationToken = installation.installationToken;
    serverPublicKey = installation.serverPublicKey;

    secretsService.set(SecretName.bunq_installationToken, installationToken);
    secretsService.set(SecretName.bunq_serverPublicKey, serverPublicKey);
  }

  if (!sessionToken || !userId) {
    try {
      const authClient = new BunqClient({
        apiKey,
        permittedIps,
        environment,
        clientPrivateKey: privateKey,
        installationToken,
        serverPublicKey,
        fetchImpl,
      });

      await authClient.registerDevice();
      const session = await authClient.createSession();
      sessionToken = session.sessionToken;
      userId = session.userId;

      secretsService.set(SecretName.bunq_sessionToken, sessionToken);
      secretsService.set(SecretName.bunq_userId, userId);
    } catch (error) {
      if (
        error instanceof BunqAuthError &&
        (error.details?.status === 401 || error.details?.status === 403)
      ) {
        console.warn(
          'bunq auth context rejected; clearing installation/session context and retrying bootstrap once',
        );
        resetAuthContext();

        const bootstrapClient = new BunqClient({
          apiKey,
          permittedIps,
          environment,
          clientPrivateKey: privateKey,
          fetchImpl,
        });

        const installation =
          await bootstrapClient.createInstallation(publicKey);
        installationToken = installation.installationToken;
        serverPublicKey = installation.serverPublicKey;

        secretsService.set(
          SecretName.bunq_installationToken,
          installationToken,
        );
        secretsService.set(SecretName.bunq_serverPublicKey, serverPublicKey);

        const authClient = new BunqClient({
          apiKey,
          permittedIps,
          environment,
          clientPrivateKey: privateKey,
          installationToken,
          serverPublicKey,
          fetchImpl,
        });

        await authClient.registerDevice();
        const session = await authClient.createSession();
        sessionToken = session.sessionToken;
        userId = session.userId;

        secretsService.set(SecretName.bunq_sessionToken, sessionToken);
        secretsService.set(SecretName.bunq_userId, userId);
      } else {
        throw error;
      }
    }
  }

  return {
    apiKey,
    environment,
    privateKey,
    installationToken,
    sessionToken,
    serverPublicKey,
    userId,
  };
}

function normalizeMonetaryAccountItem(item) {
  if (item?.MonetaryAccountBank) {
    return mapMonetaryAccount(item.MonetaryAccountBank, 'MonetaryAccountBank');
  }
  if (item?.MonetaryAccountExternal) {
    return mapMonetaryAccount(
      item.MonetaryAccountExternal,
      'MonetaryAccountExternal',
    );
  }
  if (item?.MonetaryAccountJoint) {
    return mapMonetaryAccount(
      item.MonetaryAccountJoint,
      'MonetaryAccountJoint',
    );
  }
  if (item?.MonetaryAccountSavings) {
    return mapMonetaryAccount(
      item.MonetaryAccountSavings,
      'MonetaryAccountSavings',
    );
  }
  return null;
}

function getObjectKeyPaths(value, maxDepth = 4) {
  /** @type {string[]} */
  const keyPaths = [];

  /** @param {unknown} currentValue */
  function visit(currentValue, prefix, depth) {
    if (
      depth > maxDepth ||
      !currentValue ||
      typeof currentValue !== 'object' ||
      Array.isArray(currentValue)
    ) {
      return;
    }

    for (const key of Object.keys(currentValue)) {
      const path = prefix ? `${prefix}.${key}` : key;
      keyPaths.push(path);
      visit(currentValue[key], path, depth + 1);
    }
  }

  visit(value, '', 1);
  return keyPaths;
}

function mapMonetaryAccount(account, sourceType) {
  const alias = Array.isArray(account.alias)
    ? account.alias.find(a => a?.type === 'IBAN') || account.alias[0]
    : null;
  const iban = alias?.value || '';

  return {
    sourceType,
    id: String(account.id),
    account_id: String(account.id),
    name: account.description || `Bunq account ${account.id}`,
    official_name: account.description || `Bunq account ${account.id}`,
    institution: 'bunq',
    mask: iban ? iban.slice(-4) : '',
    iban,
    currency: account.currency || 'EUR',
    balance: Math.round(Number(account.balance?.value || 0) * 100),
  };
}

function isActiveMonetaryAccount(item) {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const account =
    item.MonetaryAccountBank ||
    item.MonetaryAccountExternal ||
    item.MonetaryAccountJoint ||
    item.MonetaryAccountSavings;

  return account?.status === 'ACTIVE';
}

function parsePaginationQuery(url) {
  if (!url || typeof url !== 'string') {
    return {};
  }

  try {
    const parsed = new URL(url, 'https://api.bunq.com');
    return {
      olderId: parsed.searchParams.get('older_id'),
      newerId: parsed.searchParams.get('newer_id'),
      futureId: parsed.searchParams.get('future_id'),
    };
  } catch {
    return {};
  }
}

export function extractPaginationCursor(responseJson) {
  const topLevelPagination = responseJson?.Pagination;
  const embeddedPagination = Array.isArray(responseJson?.Response)
    ? responseJson.Response.find(entry => entry?.Pagination)?.Pagination
    : null;
  const pagination = topLevelPagination || embeddedPagination || null;

  const fromOlderUrl = parsePaginationQuery(pagination?.older_url).olderId;
  const fromNewerUrl = parsePaginationQuery(pagination?.newer_url).newerId;
  const fromFutureUrl = parsePaginationQuery(pagination?.future_url).futureId;

  return {
    olderId:
      String(
        pagination?.older_id || pagination?.olderId || fromOlderUrl || '',
      ) || null,
    newerId:
      String(
        pagination?.newer_id || pagination?.newerId || fromNewerUrl || '',
      ) || null,
    futureId:
      String(
        pagination?.future_id || pagination?.futureId || fromFutureUrl || '',
      ) || null,
    olderUrl:
      typeof pagination?.older_url === 'string' && pagination.older_url
        ? pagination.older_url
        : null,
    newerUrl:
      typeof pagination?.newer_url === 'string' && pagination.newer_url
        ? pagination.newer_url
        : null,
    futureUrl:
      typeof pagination?.future_url === 'string' && pagination.future_url
        ? pagination.future_url
        : null,
  };
}

function extractPayments(responseJson) {
  const entries = responseJson?.Response;
  if (!Array.isArray(entries)) {
    throw new BunqInvalidResponseError(
      'Unexpected Bunq payment response shape',
    );
  }

  return entries
    .map(entry => entry?.Payment)
    .filter(Boolean)
    .map(payment => ({ ...payment, id: String(payment.id) }));
}

function extractEvents(responseJson) {
  const entries = responseJson?.Response;
  if (!Array.isArray(entries)) {
    throw new BunqInvalidResponseError('Unexpected Bunq event response shape');
  }

  return entries
    .map(entry => entry?.Event)
    .filter(Boolean)
    .map(event => ({ ...event, id: String(event.id) }));
}

function getPaymentIdFromEvent(event) {
  const candidates = [
    event?.object?.Payment?.id,
    event?.object_data_at_event?.Payment?.id,
    event?.object?.PaymentBatch?.payment?.id,
    event?.object_data_at_event?.PaymentBatch?.payment?.id,
  ];

  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim() !== '') {
      return String(candidate);
    }
  }

  return null;
}

function normalizeCategoryType(categoryType) {
  if (typeof categoryType !== 'string') {
    return null;
  }

  const trimmed = categoryType.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function getEventCategoryType(event) {
  const categoryType =
    event?.additional_transaction_information?.category?.description ||
    event?.additional_transaction_information?.category?.type ||
    null;

  return normalizeCategoryType(categoryType);
}

function normalizeDay(value) {
  if (value == null) {
    return null;
  }

  const day = String(value).slice(0, 10);
  return day || null;
}

function normalizeAmount(value) {
  const parsed = Number(value ?? NaN);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed.toFixed(2);
}

function normalizeCounterpartyIdentity(alias) {
  if (!alias) {
    return null;
  }

  const candidate = Array.isArray(alias) ? alias[0] : alias;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const labelUser = candidate.label_user;
  const identityParts = [
    candidate.iban,
    candidate.email,
    candidate.phone_number,
    labelUser?.uuid,
    candidate.display_name,
  ]
    .filter(Boolean)
    .map(part => String(part).trim().toLowerCase());

  if (identityParts.length === 0) {
    return null;
  }

  return identityParts.join('|');
}

function getEventPaymentLike(event) {
  const normalizeMasterCardAction = masterCardAction => {
    if (!masterCardAction || typeof masterCardAction !== 'object') {
      return null;
    }

    return {
      created: masterCardAction.created,
      amount: masterCardAction.amount_billing || masterCardAction.amount_local || null,
      monetary_account_id: masterCardAction.monetary_account_id,
      counterparty_alias:
        masterCardAction.counterparty_alias ||
        masterCardAction.merchant_alias ||
        masterCardAction.alias ||
        null,
    };
  };

  const directObject = event?.object?.Payment;
  if (directObject && typeof directObject === 'object') {
    return directObject;
  }

  const directMasterCardAction = normalizeMasterCardAction(
    event?.object?.MasterCardAction,
  );
  if (directMasterCardAction) {
    return directMasterCardAction;
  }

  const objectDataAtEvent = event?.object_data_at_event?.Payment;
  if (objectDataAtEvent && typeof objectDataAtEvent === 'object') {
    return objectDataAtEvent;
  }

  const objectDataAtEventMasterCardAction = normalizeMasterCardAction(
    event?.object_data_at_event?.MasterCardAction,
  );
  if (objectDataAtEventMasterCardAction) {
    return objectDataAtEventMasterCardAction;
  }

  const batchPayment =
    event?.object?.PaymentBatch?.payment ||
    event?.object_data_at_event?.PaymentBatch?.payment;

  if (Array.isArray(batchPayment)) {
    return batchPayment[0] || null;
  }

  return batchPayment && typeof batchPayment === 'object' ? batchPayment : null;
}

function getEventObjectTypes(event) {
  const types = [];

  const objectTypes = event?.object && typeof event.object === 'object' ? Object.keys(event.object) : [];
  for (const type of objectTypes) {
    types.push(`object.${type}`);
  }

  const objectDataTypes =
    event?.object_data_at_event && typeof event.object_data_at_event === 'object'
      ? Object.keys(event.object_data_at_event)
      : [];
  for (const type of objectDataTypes) {
    types.push(`object_data_at_event.${type}`);
  }

  return types.length > 0 ? [...new Set(types)] : ['[none]'];
}

function getEventRequestInquiryLike(event) {
  const findRequestLikeCandidate = source => {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const directCandidates = [source, source?.RequestInquiry];
    for (const directCandidate of directCandidates) {
      if (!directCandidate || typeof directCandidate !== 'object') {
        continue;
      }

      if (directCandidate.amount_responded || directCandidate.amount_inquired) {
        return directCandidate;
      }
    }

    for (const value of Object.values(source)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }

      if (value.amount_responded || value.amount_inquired) {
        return value;
      }
    }

    return null;
  };

  const candidates = [event?.object, event?.object_data_at_event];

  for (const candidate of candidates) {
    const requestLikeCandidate = findRequestLikeCandidate(candidate);
    if (requestLikeCandidate) {
      return requestLikeCandidate;
    }
  }

  return null;
}

function flipNormalizedAmount(amount) {
  if (!amount) {
    return null;
  }

  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return (-parsed).toFixed(2);
}

function buildMatchKey({ day, amount, currency, accountId, counterpartyIdentity }) {
  if (!day || !amount || !currency || !accountId) {
    return null;
  }

  const baseKey = [
    day,
    amount,
    String(currency).trim().toUpperCase(),
    String(accountId).trim(),
  ].join('|');

  if (counterpartyIdentity) {
    return `${baseKey}|${counterpartyIdentity}`;
  }

  return baseKey;
}

function getPaymentMatchKeys(payment, fallbackAccountId) {
  const day = normalizeDay(payment?.created);
  const amount = normalizeAmount(payment?.amount?.value);
  const currency = payment?.amount?.currency;
  const accountId = payment?.monetary_account_id || fallbackAccountId;
  const counterpartyIdentity = normalizeCounterpartyIdentity(
    payment?.counterparty_alias,
  );

  return {
    strictKey: buildMatchKey({
      day,
      amount,
      currency,
      accountId,
      counterpartyIdentity,
    }),
    broadKey: buildMatchKey({
      day,
      amount,
      currency,
      accountId,
      counterpartyIdentity: null,
    }),
  };
}

function getEventMatchKeys(event, fallbackAccountId) {
  const paymentLike = getEventPaymentLike(event);
  const requestInquiryLike = paymentLike ? null : getEventRequestInquiryLike(event);
  const objectTypes = getEventObjectTypes(event);

  const inquiryAmountSource =
    requestInquiryLike?.amount_responded || requestInquiryLike?.amount_inquired;

  const dayCandidates = [
    normalizeDay(event?.created),
    normalizeDay(paymentLike?.created),
    normalizeDay(requestInquiryLike?.time_responded),
    normalizeDay(requestInquiryLike?.created),
  ].filter(Boolean);
  const uniqueDayCandidates = [...new Set(dayCandidates)];
  const day = uniqueDayCandidates[0] || null;
  const amount = normalizeAmount(
    paymentLike?.amount?.value || inquiryAmountSource?.value,
  );
  const currency = paymentLike?.amount?.currency || inquiryAmountSource?.currency;
  const accountId =
    paymentLike?.monetary_account_id ||
    requestInquiryLike?.monetary_account_id ||
    event?.monetary_account_id ||
    fallbackAccountId;
  const counterpartyIdentity = normalizeCounterpartyIdentity(
    paymentLike?.counterparty_alias || requestInquiryLike?.counterparty_alias,
  );

  const strictKey = buildMatchKey({
    day,
    amount,
    currency,
    accountId,
    counterpartyIdentity,
  });
  const broadKey = buildMatchKey({
    day,
    amount,
    currency,
    accountId,
    counterpartyIdentity: null,
  });

  const flippedAmount = flipNormalizedAmount(amount);
  const flippedStrictKey = buildMatchKey({
    day,
    amount: flippedAmount,
    currency,
    accountId,
    counterpartyIdentity,
  });
  const flippedBroadKey = buildMatchKey({
    day,
    amount: flippedAmount,
    currency,
    accountId,
    counterpartyIdentity: null,
  });

  return {
    strictKey,
    broadKey,
    flippedStrictKey,
    flippedBroadKey,
    alternateDays: uniqueDayCandidates.slice(1),
    fields: {
      amount,
      currency,
      accountId,
      counterpartyIdentity,
    },
    hasComputedKey: Boolean(strictKey || broadKey),
    objectTypes,
    missing: {
      amount: !amount,
      currency: !currency,
      account: !accountId,
      counterparty: !counterpartyIdentity,
    },
  };
}

function appendToIndex(index, key, paymentId) {
  if (!key) {
    return;
  }

  const existing = index.get(key);
  if (!existing) {
    index.set(key, [paymentId]);
    return;
  }

  if (!existing.includes(paymentId)) {
    existing.push(paymentId);
  }
}

function getFallbackCandidates({
  event,
  accountId,
  strictIndex,
  broadIndex,
  paymentIdSet,
  categorizedPaymentIds,
}) {
  const eventKeys = getEventMatchKeys(event, accountId);

  const resolveCandidates = (strictKey, broadKey) => {
    const strictCandidates = strictKey ? strictIndex.get(strictKey) || [] : [];
    let currentCandidates = strictCandidates;
    if (currentCandidates.length === 0 && broadKey) {
      currentCandidates = broadIndex.get(broadKey) || [];
    }
    return currentCandidates;
  };

  const buildDayKeys = day => {
    const amount = eventKeys.fields?.amount || null;
    const currency = eventKeys.fields?.currency || null;
    const accountIdFromKey = eventKeys.fields?.accountId || null;
    const counterpartyIdentity = eventKeys.fields?.counterpartyIdentity || null;

    const strictKey = buildMatchKey({
      day,
      amount,
      currency,
      accountId: accountIdFromKey,
      counterpartyIdentity,
    });
    const broadKey = buildMatchKey({
      day,
      amount,
      currency,
      accountId: accountIdFromKey,
      counterpartyIdentity: null,
    });
    const flippedAmount = flipNormalizedAmount(amount);
    const flippedStrictKey = buildMatchKey({
      day,
      amount: flippedAmount,
      currency,
      accountId: accountIdFromKey,
      counterpartyIdentity,
    });
    const flippedBroadKey = buildMatchKey({
      day,
      amount: flippedAmount,
      currency,
      accountId: accountIdFromKey,
      counterpartyIdentity: null,
    });

    return { strictKey, broadKey, flippedStrictKey, flippedBroadKey };
  };

  let usedSignFlip = false;
  let candidates = resolveCandidates(eventKeys.strictKey, eventKeys.broadKey);

  if (candidates.length === 0) {
    const flippedCandidates = resolveCandidates(
      eventKeys.flippedStrictKey,
      eventKeys.flippedBroadKey,
    );
    if (flippedCandidates.length > 0) {
      usedSignFlip = true;
      candidates = flippedCandidates;
    }
  }

  if (candidates.length === 0 && Array.isArray(eventKeys.alternateDays)) {
    for (const alternateDay of eventKeys.alternateDays) {
      const dayKeys = buildDayKeys(alternateDay);
      candidates = resolveCandidates(dayKeys.strictKey, dayKeys.broadKey);
      if (candidates.length === 0) {
        const flippedCandidates = resolveCandidates(
          dayKeys.flippedStrictKey,
          dayKeys.flippedBroadKey,
        );
        if (flippedCandidates.length > 0) {
          usedSignFlip = true;
          candidates = flippedCandidates;
          break;
        }
      } else {
        break;
      }
    }
  }

  const filteredCandidates = candidates.filter(candidateId => {
    if (categorizedPaymentIds.has(candidateId)) {
      return false;
    }
    if (paymentIdSet && !paymentIdSet.has(candidateId)) {
      return false;
    }
    return true;
  });

  return {
    candidates: filteredCandidates,
    usedSignFlip,
    hasComputedKey: eventKeys.hasComputedKey,
    objectTypes: eventKeys.objectTypes,
    missing: eventKeys.missing,
  };
}

function incrementObjectTypeMissCoverage(bucket, objectTypes) {
  if (!bucket || typeof bucket !== 'object') {
    return;
  }

  const keys = Array.isArray(objectTypes) && objectTypes.length > 0 ? objectTypes : ['[unknown]'];
  for (const objectType of keys) {
    bucket[objectType] = (bucket[objectType] || 0) + 1;
  }
}

async function listEventsForAccount(client, userId, accountId, payments = []) {
  const startedAt = nowMs();
  const paymentIdSet =
    Array.isArray(payments) && payments.length > 0
      ? new Set(payments.map(payment => String(payment.id)))
      : null;
  const categoryByPaymentId = new Map();
  const seenEventIds = new Set();
  const strictFallbackIndex = new Map();
  const broadFallbackIndex = new Map();
  const stats = {
    pagesFetched: 0,
    eventsScanned: 0,
    idMatches: 0,
    fallbackMatches: 0,
    fallbackSignFlipMatches: 0,
    ambiguousFallbacks: 0,
    eventsWithCategory: 0,
    fallbackEligibleEvents: 0,
    fallbackEventsWithComputedKey: 0,
    fallbackEventsMissingKey: 0,
    fallbackMissReasons: {
      missingAmount: 0,
      missingCurrency: 0,
      missingAccount: 0,
      missingCounterparty: 0,
      noCandidate: 0,
      ambiguous: 0,
    },
    fallbackMissObjectTypes: {
      missingKey: {},
      noCandidate: {},
    },
  };

  if (Array.isArray(payments) && payments.length > 0) {
    for (const payment of payments) {
      const paymentId = String(payment.id);
      const keys = getPaymentMatchKeys(payment, accountId);
      appendToIndex(strictFallbackIndex, keys.strictKey, paymentId);
      appendToIndex(broadFallbackIndex, keys.broadKey, paymentId);
    }
  }
  let olderId = null;
  let olderUrl = null;
  let stopReason = 'max_pages_reached';
  let pagesWithoutNewMappings = 0;

  console.debug('bunq listEvents pagination start', {
    userId,
    accountId,
    pageSize: DEFAULT_PAGE_SIZE,
    maxPages: MAX_EVENT_PAGES,
    timeBudgetMs: EVENTS_TIME_BUDGET_MS,
    paymentCount: paymentIdSet?.size ?? null,
  });

  for (let i = 0; i < MAX_EVENT_PAGES; i++) {
    if (nowMs() - startedAt >= EVENTS_TIME_BUDGET_MS) {
      stopReason = 'time_budget_exceeded';
      break;
    }

    const mappedCategoriesBeforePage = categoryByPaymentId.size;
    const response = await client.listEvents(userId, {
      count: olderUrl ? undefined : DEFAULT_PAGE_SIZE,
      olderId: olderUrl ? undefined : olderId,
      monetaryAccountId: olderUrl ? undefined : accountId,
      displayUserEvent: olderUrl ? undefined : false,
      paginationUrl: olderUrl,
    });
    stats.pagesFetched += 1;

    const pageEvents = extractEvents(response);
    const pagination = extractPaginationCursor(response);

    console.debug('bunq listEvents page fetched', {
      userId,
      accountId,
      pageNumber: i + 1,
      mode: olderUrl ? 'pagination_url' : 'query_params',
      requestOlderId: olderId,
      requestOlderUrl: olderUrl ? '[present]' : '[none]',
      eventsInPage: pageEvents.length,
      nextOlderId: pagination.olderId,
      nextOlderUrl: pagination.olderUrl ? '[present]' : '[none]',
      elapsedMs: nowMs() - startedAt,
    });

    for (const event of pageEvents) {
      if (seenEventIds.has(event.id)) {
        continue;
      }

      seenEventIds.add(event.id);
      stats.eventsScanned += 1;

      const categoryType = getEventCategoryType(event);
      if (!categoryType) {
        continue;
      }
      stats.eventsWithCategory += 1;

      const paymentId = getPaymentIdFromEvent(event);
      if (paymentId) {
        if (!categoryByPaymentId.has(paymentId)) {
          if (!paymentIdSet || paymentIdSet.has(paymentId)) {
            categoryByPaymentId.set(paymentId, categoryType);
            stats.idMatches += 1;
          }
        }
        continue;
      }

      if (!paymentIdSet || paymentIdSet.size === 0) {
        continue;
      }

      stats.fallbackEligibleEvents += 1;

      const fallback = getFallbackCandidates({
        event,
        accountId,
        strictIndex: strictFallbackIndex,
        broadIndex: broadFallbackIndex,
        paymentIdSet,
        categorizedPaymentIds: categoryByPaymentId,
      });

      if (fallback.hasComputedKey) {
        stats.fallbackEventsWithComputedKey += 1;
      } else {
        stats.fallbackEventsMissingKey += 1;
        incrementObjectTypeMissCoverage(
          stats.fallbackMissObjectTypes.missingKey,
          fallback.objectTypes,
        );
      }

      const fallbackCandidates = fallback.candidates;

      if (fallbackCandidates.length === 1) {
        categoryByPaymentId.set(fallbackCandidates[0], categoryType);
        stats.fallbackMatches += 1;
        if (fallback.usedSignFlip) {
          stats.fallbackSignFlipMatches += 1;
        }
      } else if (fallbackCandidates.length > 1) {
        stats.ambiguousFallbacks += 1;
        stats.fallbackMissReasons.ambiguous += 1;
        if (fallback.missing.counterparty) {
          stats.fallbackMissReasons.missingCounterparty += 1;
        }
      } else {
        stats.fallbackMissReasons.noCandidate += 1;
        incrementObjectTypeMissCoverage(
          stats.fallbackMissObjectTypes.noCandidate,
          fallback.objectTypes,
        );
        if (fallback.missing.amount) {
          stats.fallbackMissReasons.missingAmount += 1;
        }
        if (fallback.missing.currency) {
          stats.fallbackMissReasons.missingCurrency += 1;
        }
        if (fallback.missing.account) {
          stats.fallbackMissReasons.missingAccount += 1;
        }
        if (fallback.missing.counterparty) {
          stats.fallbackMissReasons.missingCounterparty += 1;
        }
      }
    }

    const mappedCategoriesAfterPage = categoryByPaymentId.size;
    if (mappedCategoriesAfterPage > mappedCategoriesBeforePage) {
      pagesWithoutNewMappings = 0;
    } else {
      pagesWithoutNewMappings += 1;
    }

    if (paymentIdSet && categoryByPaymentId.size >= paymentIdSet.size) {
      stopReason = 'all_payment_categories_mapped';
      break;
    }

    if (
      paymentIdSet &&
      paymentIdSet.size > 0 &&
      stats.eventsScanned >= EVENT_NO_PROGRESS_MIN_EVENTS_SCANNED &&
      pagesWithoutNewMappings >= EVENT_NO_PROGRESS_PAGE_LIMIT
    ) {
      stopReason = 'mapping_progress_stalled';
      break;
    }

    if (!pagination.olderId && !pagination.olderUrl) {
      stopReason = 'pagination_end';
      break;
    }

    if (
      pagination.olderId === olderId &&
      (!pagination.olderUrl || pagination.olderUrl === olderUrl)
    ) {
      stopReason = 'pagination_cursor_not_advanced';
      break;
    }

    olderId = pagination.olderId;
    olderUrl = pagination.olderUrl;
  }

  console.debug('bunq listEvents pagination complete', {
    userId,
    accountId,
    pagesFetched: stats.pagesFetched,
    eventsScanned: stats.eventsScanned,
    categoriesMapped: categoryByPaymentId.size,
    stopReason,
    elapsedMs: nowMs() - startedAt,
  });

  /*console.log('bunq: event category match coverage', {
    accountId,
    pagesFetched: stats.pagesFetched,
    eventsScanned: stats.eventsScanned,
    eventsWithCategory: stats.eventsWithCategory,
    idMatches: stats.idMatches,
    fallbackMatches: stats.fallbackMatches,
    fallbackSignFlipMatches: stats.fallbackSignFlipMatches,
    ambiguousFallbacks: stats.ambiguousFallbacks,
    fallbackEligibleEvents: stats.fallbackEligibleEvents,
    fallbackEventsWithComputedKey: stats.fallbackEventsWithComputedKey,
    fallbackEventsMissingKey: stats.fallbackEventsMissingKey,
    fallbackMissReasons: stats.fallbackMissReasons,
    fallbackMissObjectTypes: stats.fallbackMissObjectTypes,
    unmatchedPayments:
      paymentIdSet?.size != null
        ? Math.max(paymentIdSet.size - categoryByPaymentId.size, 0)
        : null,
  });*/

  return categoryByPaymentId;
}

export function normalizeBunqPayment(payment, categoryType = null) {
  const value = Number(payment?.amount?.value ?? 0);
  const amount = Number.isFinite(value) ? value.toFixed(2) : '0.00';

  const date = String(payment?.created || '').slice(0, 10);
  if (!date) {
    throw new BunqInvalidResponseError('Bunq payment is missing created date', {
      paymentId: payment?.id,
    });
  }

  const counterpartyAlias = Array.isArray(payment?.counterparty_alias)
    ? payment.counterparty_alias[0]
    : payment?.counterparty_alias;

  const payeeName =
    payment?.counterparty_alias?.display_name ||
    counterpartyAlias?.display_name ||
    payment?.description ||
    'bunq';

  const notesBase = typeof payment?.description === 'string' ? payment.description.trim() : '';
  const notes = notesBase || null;
  const normalizedCategoryType = normalizeCategoryType(categoryType);

  /*console.log('bunq: normalized payment', {
    paymentId: payment?.id,
    date,
    amount,
    currency: payment?.amount?.currency,
    payeeName,
    notes,
    categoryType,
    normalizedCategoryType,
  });*/
  return {
    booked: true,
    date,
    bookingDate: date,
    valueDate: date,
    postedDate: date,
    transactedDate: date,
    sortOrder: Date.parse(payment.created || date),
    payeeName,
    notes,
    transactionCategory: normalizedCategoryType,
    transactionAmount: {
      amount,
      currency: payment?.amount?.currency || 'EUR',
    },
    transactionId: String(payment.id),
    internalTransactionId: String(payment.id),
  };
}

function mergeNewerId(currentNewerId, payments) {
  let maxId = currentNewerId;
  for (const payment of payments) {
    const paymentId = String(payment.id || '');
    if (!paymentId) {
      continue;
    }

    if (!maxId) {
      maxId = paymentId;
      continue;
    }

    const asCurrent = Number(maxId);
    const asPayment = Number(paymentId);

    if (Number.isFinite(asCurrent) && Number.isFinite(asPayment)) {
      if (asPayment > asCurrent) {
        maxId = paymentId;
      }
    } else if (paymentId > maxId) {
      maxId = paymentId;
    }
  }
  return maxId;
}

async function getCurrentAccountBalance(client, userId, accountId) {
  const accountsResponse = await client.listMonetaryAccounts(userId);
  const account = (accountsResponse?.Response || [])
    .map(normalizeMonetaryAccountItem)
    .find(acc => acc?.account_id === String(accountId));

  return account?.balance ?? null;
}

function mapBunqError(error) {
  if (
    error instanceof BunqAuthError ||
    error instanceof BunqRateLimitError ||
    error instanceof BunqSignatureError ||
    error instanceof BunqInvalidResponseError ||
    error instanceof BunqConfigurationError ||
    error instanceof BunqProtocolError
  ) {
    return {
      error_type: error.error_type,
      error_code: error.error_code,
      reason: error.message,
    };
  }

  throw error;
}

export const bunqService = {
  isConfigured() {
    return Boolean(getApiKey());
  },

  /** @param {{ fetchImpl?: typeof fetch }} [options] */
  async getStatus(options = {}) {
    const configured = this.isConfigured();
    if (!configured) {
      return {
        configured,
        environment: getEnvironment(),
        authContextReady: false,
      };
    }

    try {
      await ensureApiContext(options.fetchImpl);
      return {
        configured,
        environment: getEnvironment(),
        authContextReady: true,
      };
    } catch (error) {
      if (
        error instanceof BunqConfigurationError ||
        error instanceof BunqProtocolError
      ) {
        return {
          configured,
          environment: getEnvironment(),
          authContextReady: false,
          error_type: error.error_type,
          error_code: error.error_code,
          reason: error.message,
        };
      }
      throw error;
    }
  },

  /** @param {{ fetchImpl?: typeof fetch }} [options] */
  async listAccounts(options = {}) {
    try {
      const context = await ensureApiContext(options.fetchImpl);
      const client = createClient(options.fetchImpl);
      client.clientPrivateKey = context.privateKey;
      client.installationToken = context.installationToken;
      client.sessionToken = context.sessionToken;
      client.serverPublicKey = context.serverPublicKey;

      /*console.log('bunq: listing monetary accounts', {
        userId: context.userId,
      });*/
      const response = await client.listMonetaryAccounts(context.userId);
      /*console.log('bunq: listed monetary accounts', {
        userId: context.userId,
        response: JSON.stringify(response),
        responseItems: (response?.Response || []).length,
      });*/
      const responseItems = response?.Response || [];
      const activeResponseItems = responseItems.filter(isActiveMonetaryAccount);
      const filteredItems = [];

      const accounts = activeResponseItems
        .map((item, index) => {
          const normalized = normalizeMonetaryAccountItem(item);
          if (!normalized) {
            filteredItems.push({
              index,
              keys:
                item && typeof item === 'object'
                  ? Object.keys(item)
                  : ['[non-object-item]'],
              keyPaths: getObjectKeyPaths(item),
            });
          }
          return normalized;
        })
        .filter(Boolean);

      if (filteredItems.length > 0) {
        console.warn('bunq: filtered unsupported monetary account items', {
          userId: context.userId,
          totalResponseItems: responseItems.length,
          filteredCount: filteredItems.length,
          filteredItems,
          filteredItemsJson: JSON.stringify(filteredItems),
        });
      }

      return {
        accounts,
      };
    } catch (error) {
      return mapBunqError(error);
    }
  },

  /**
 * @param {{
 *   accountId: string;
 *   startDate?: string;
 *   cursor?: { newerId?: string | null } | null;
 *   importCategory?: boolean;
 *   fetchImpl?: typeof fetch;
 * }} options
 */
  async listTransactions(options) {
    try {
      const context = await ensureApiContext(options.fetchImpl);
      const client = createClient(options.fetchImpl);
      client.clientPrivateKey = context.privateKey;
      client.installationToken = context.installationToken;
      client.sessionToken = context.sessionToken;
      client.serverPublicKey = context.serverPublicKey;

      const accountId = String(options.accountId);
      const startDate = options.startDate || null;
      const incomingCursor = options.cursor || null;
      const importCategory = options.importCategory ?? true;

      const seenIds = new Set();
      const payments = [];
      const useIncremental = Boolean(incomingCursor?.newerId);
      const paymentsStartedAt = nowMs();
      let paymentPagesFetched = 0;

      console.debug('bunq listPayments pagination start', {
        userId: context.userId,
        accountId,
        mode: useIncremental ? 'incremental_newer' : 'historical_older',
        startDate,
      incomingCursor: incomingCursor?.newerId || null,
      pageSize: DEFAULT_PAGE_SIZE,
      maxPages: MAX_PAGES,
      timeBudgetMs: PAYMENTS_TIME_BUDGET_MS,
    });

      let paymentsStopReason = 'max_pages_reached';

      if (useIncremental) {
        let newerId = incomingCursor.newerId;
        let newerUrl = null;

        for (let i = 0; i < MAX_PAGES && newerId; i++) {
          if (nowMs() - paymentsStartedAt >= PAYMENTS_TIME_BUDGET_MS) {
            paymentsStopReason = 'time_budget_exceeded';
            break;
          }

          paymentPagesFetched += 1;
          const response = await client.listPayments(
            context.userId,
            accountId,
            {
              count: newerUrl ? undefined : DEFAULT_PAGE_SIZE,
              newerId: newerUrl ? undefined : newerId,
              paginationUrl: newerUrl,
            },
          );

          const pagePayments = extractPayments(response);
          const pagination = extractPaginationCursor(response);

          /*console.debug('bunq listPayments page fetched', {
            userId: context.userId,
            accountId,
            pageNumber: i + 1,
            mode: newerUrl ? 'pagination_url' : 'query_params',
            requestNewerId: newerId,
            requestNewerUrl: newerUrl ? '[present]' : '[none]',
            paymentsInPage: pagePayments.length,
            nextNewerId: pagination.newerId,
            nextNewerUrl: pagination.newerUrl ? '[present]' : '[none]',
            elapsedMs: nowMs() - paymentsStartedAt,
          });*/

          for (const payment of pagePayments) {
            if (seenIds.has(payment.id)) {
              continue;
            }
            seenIds.add(payment.id);
            payments.push(payment);
          }

          if (!pagination.newerId && !pagination.newerUrl) {
            paymentsStopReason = 'pagination_end';
            break;
          }

          if (
            pagination.newerId === newerId &&
            (!pagination.newerUrl || pagination.newerUrl === newerUrl)
          ) {
            paymentsStopReason = 'pagination_cursor_not_advanced';
            break;
          }

          newerId = pagination.newerId;
          newerUrl = pagination.newerUrl;
        }
      } else {
        let olderId = null;
        let olderUrl = null;
        let stop = false;

        for (let i = 0; i < MAX_PAGES && !stop; i++) {
          if (nowMs() - paymentsStartedAt >= PAYMENTS_TIME_BUDGET_MS) {
            paymentsStopReason = 'time_budget_exceeded';
            break;
          }

          paymentPagesFetched += 1;
          const response = await client.listPayments(
            context.userId,
            accountId,
            {
              count: olderUrl ? undefined : DEFAULT_PAGE_SIZE,
              olderId: olderUrl ? undefined : olderId,
              paginationUrl: olderUrl,
            },
          );

          const pagePayments = extractPayments(response);
          const pagination = extractPaginationCursor(response);

          console.debug('bunq listPayments page fetched', {
            userId: context.userId,
            accountId,
            pageNumber: i + 1,
            mode: olderUrl ? 'pagination_url' : 'query_params',
            requestOlderId: olderId,
            requestOlderUrl: olderUrl ? '[present]' : '[none]',
            paymentsInPage: pagePayments.length,
            nextOlderId: pagination.olderId,
            nextOlderUrl: pagination.olderUrl ? '[present]' : '[none]',
            elapsedMs: nowMs() - paymentsStartedAt,
          });

          for (const payment of pagePayments) {
            const paymentDate = String(payment?.created || '').slice(0, 10);
            if (startDate && paymentDate && paymentDate < startDate) {
              stop = true;
              paymentsStopReason = 'start_date_boundary';
              continue;
            }

            if (seenIds.has(payment.id)) {
              continue;
            }
            seenIds.add(payment.id);
            payments.push(payment);
          }

          if (stop) {
            break;
          }

          if (!pagination.olderId && !pagination.olderUrl) {
            paymentsStopReason = 'pagination_end';
            break;
          }

          if (
            pagination.olderId === olderId &&
            (!pagination.olderUrl || pagination.olderUrl === olderUrl)
          ) {
            paymentsStopReason = 'pagination_cursor_not_advanced';
            break;
          }

          olderId = pagination.olderId;
          olderUrl = pagination.olderUrl;
        }
      }

      /*console.debug('bunq listPayments pagination complete', {
        userId: context.userId,
        accountId,
        mode: useIncremental ? 'incremental_newer' : 'historical_older',
        pagesFetched: paymentPagesFetched,
        paymentsFetched: payments.length,
        uniquePaymentIds: seenIds.size,
        stopReason: paymentsStopReason,
        elapsedMs: nowMs() - paymentsStartedAt,
      });*/

      let paymentCategoryTypeById = new Map();
      if (importCategory) {
        try {
          paymentCategoryTypeById = await listEventsForAccount(
            client,
            context.userId,
            accountId,
            payments,
          );
        } catch (error) {
          console.warn(
            'bunq: failed to fetch or map events; importing transactions without category tags',
            {
              userId: context.userId,
              accountId,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      const all = payments
        .map(payment => {
          const categoryType = paymentCategoryTypeById.get(String(payment.id)) || null;
          return normalizeBunqPayment(payment, categoryType);
        })
        .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));

      const _categorizedTransactions = all.filter(tx => tx.transactionCategory).length;
      /*console.log('bunq: transaction category assignment summary', {
        accountId,
        totalTransactions: all.length,
        categorizedTransactions: _categorizedTransactions,
        uncategorizedTransactions: all.length - _categorizedTransactions,
      });*/

      const startingBalance = await getCurrentAccountBalance(
        client,
        context.userId,
        accountId,
      );

      return {
        balances: [],
        startingBalance,
        transactions: {
          all,
          booked: all,
          pending: [],
        },
        cursor: {
          newerId: mergeNewerId(incomingCursor?.newerId || null, payments),
        },
      };
    } catch (error) {
      return mapBunqError(error);
    }
  },

  notImplemented(operation) {
    throw new BunqNotImplementedYetError(operation);
  },
};
