import { randomUUID } from 'node:crypto';

import express from 'express';
import type { Request, Response } from 'express';

import { isAdmin } from '#account-db';
import { handleError } from '#app-gocardless/util/handle-error';
import { config } from '#load-config';
import * as UserService from '#services/user-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';
import { isValidFileId } from '#util/paths';
import { assertUrlAllowed } from '#util/ssrf';

import {
  isBankListAvailable,
  lookupBank,
  searchBanks,
} from './fints-bank-list';
import {
  getConnection,
  loadConnections,
  putConnection,
  removeConnection,
  summarizeConnection,
} from './fints-connections';
import type { ConnectionScope, FinTSConnection } from './fints-connections';
import {
  authenticate,
  fetchTransactions,
  getProductId,
  listAccounts,
  resetSession,
} from './fints-service';
import type { FinTSAuthInput } from './fints-service';

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

function canAccessFile(fileId: string, userId: string) {
  return isAdmin(userId) || UserService.countUserAccess(fileId, userId) > 0;
}

/**
 * Bank logins are personal. They are stored per budget file, so only users
 * with access to the file can use them. Without a file id they are global,
 * which, as for other global bank sync credentials, only admins may use.
 */
function resolveScope(
  req: Request,
  res: Response,
): { scope: ConnectionScope } | null {
  const fileId = req.get('X-Actual-File-Id');
  const userId: string = res.locals.user_id;

  if (fileId) {
    if (!isValidFileId(fileId)) {
      res.status(400).send({
        status: 'error',
        reason: 'invalid-file-id',
        details: 'invalid fileId',
      });
      return null;
    }
    if (!canAccessFile(fileId, userId)) {
      res.status(403).send({
        status: 'error',
        reason: 'file-access-denied',
        details: "You don't have permissions over this file",
      });
      return null;
    }
    return { scope: fileId };
  }

  if (!isAdmin(userId)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'Only admins can use global FinTS connections',
    });
    return null;
  }
  return { scope: null };
}

function sendData(res: Response, data: unknown) {
  res.send({ status: 'ok', data });
}

function sendError(res: Response, errorCode: string, message?: string) {
  sendData(res, {
    error_type: errorCode,
    error_code: errorCode,
    ...(message ? { reason: message } : {}),
  });
}

function asTrimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

app.post(
  '/status',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    sendData(res, {
      configured: getProductId() != null,
      productIdFromConfig: Boolean(String(config.get('fints.productId'))),
      bankListAvailable: await isBankListAvailable(
        String(config.get('fints.bankListPath')),
      ),
      connections: loadConnections(resolved.scope).map(summarizeConnection),
    });
  }),
);

app.post(
  '/bank-lookup',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    const blz = asTrimmedString(req.body?.blz, 8);
    if (!blz || !/^\d{8}$/.test(blz)) {
      sendError(res, 'INVALID_INPUT');
      return;
    }

    const bank = await lookupBank(
      String(config.get('fints.bankListPath')),
      blz,
    );
    sendData(res, { bank });
  }),
);

app.post(
  '/bank-search',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    // Two characters at least, so a single keystroke does not list
    // thousands of banks.
    const query = asTrimmedString(req.body?.query, 100);
    if (!query || query.length < 2) {
      sendData(res, { banks: [] });
      return;
    }

    const banks = await searchBanks(
      String(config.get('fints.bankListPath')),
      query,
    );
    sendData(res, { banks });
  }),
);

app.post(
  '/connections/save',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    const input = req.body?.connection ?? {};
    const name = asTrimmedString(input.name, 100);
    const blz = asTrimmedString(input.blz, 8);
    const userId = asTrimmedString(input.userId, 64);
    const customerId =
      input.customerId == null || input.customerId === ''
        ? undefined
        : asTrimmedString(input.customerId, 64);

    if (
      !name ||
      !blz ||
      !/^\d{8}$/.test(blz) ||
      !userId ||
      customerId === null
    ) {
      sendError(res, 'INVALID_INPUT');
      return;
    }

    // Without an address of their own, the bank's address comes from the
    // FinTS bank list, so users do not have to look it up.
    const url =
      asTrimmedString(input.url, 500) ??
      (await lookupBank(String(config.get('fints.bankListPath')), blz))?.url;
    if (!url) {
      sendError(res, 'BANK_URL_REQUIRED');
      return;
    }

    if (!url.startsWith('https://')) {
      sendError(res, 'BANK_URL_BLOCKED', 'The FinTS URL must use https.');
      return;
    }
    try {
      await assertUrlAllowed(url);
    } catch (error) {
      sendError(
        res,
        'BANK_URL_BLOCKED',
        error instanceof Error ? error.message : String(error),
      );
      return;
    }

    const existing =
      typeof input.id === 'string'
        ? getConnection(resolved.scope, input.id)
        : null;
    if (typeof input.id === 'string' && !existing) {
      sendError(res, 'CONNECTION_NOT_FOUND');
      return;
    }

    const loginChanged =
      !existing ||
      existing.blz !== blz ||
      existing.url !== url ||
      existing.userId !== userId ||
      existing.customerId !== customerId;

    // A different login invalidates everything learned from the bank,
    // including the stored PIN.
    const connection: FinTSConnection =
      existing && !loginChanged
        ? { ...existing, name }
        : {
            id: existing?.id ?? randomUUID(),
            name,
            blz,
            url,
            userId,
            customerId,
          };

    putConnection(resolved.scope, connection);
    if (existing && loginChanged) {
      resetSession(existing.id);
    }

    sendData(res, { connection: summarizeConnection(connection) });
  }),
);

app.post(
  '/connections/remove',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    const connectionId = asTrimmedString(req.body?.connectionId, 64);
    if (!connectionId || !removeConnection(resolved.scope, connectionId)) {
      sendError(res, 'CONNECTION_NOT_FOUND');
      return;
    }

    resetSession(connectionId);
    sendData(res, { removed: true });
  }),
);

app.post(
  '/auth',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    const body = req.body ?? {};
    const connectionId = asTrimmedString(body.connectionId, 64);
    if (!connectionId) {
      sendError(res, 'INVALID_INPUT');
      return;
    }

    const input: FinTSAuthInput = {
      pin: typeof body.pin === 'string' ? body.pin : undefined,
      storePin: body.storePin === true,
      tanMethodId:
        typeof body.tanMethodId === 'number' ? body.tanMethodId : undefined,
      tanMediaName:
        typeof body.tanMediaName === 'string' ? body.tanMediaName : undefined,
      tanReference:
        typeof body.tanReference === 'string' ? body.tanReference : undefined,
      tan: typeof body.tan === 'string' ? body.tan.trim() : undefined,
      cancel: body.cancel === true,
      refresh: body.refresh === true,
    };

    sendData(res, await authenticate(resolved.scope, connectionId, input));
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    const connectionId = asTrimmedString(req.body?.connectionId, 64);
    if (!connectionId) {
      sendError(res, 'INVALID_INPUT');
      return;
    }

    const result = listAccounts(resolved.scope, connectionId);
    if ('error' in result) {
      sendError(res, result.error);
      return;
    }
    sendData(res, result);
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const resolved = resolveScope(req, res);
    if (!resolved) return;

    const accountId = asTrimmedString(req.body?.accountId, 200);
    const startDate = asTrimmedString(req.body?.startDate, 10);
    if (!accountId || !startDate) {
      sendError(res, 'INVALID_INPUT');
      return;
    }

    const result = await fetchTransactions(
      resolved.scope,
      accountId,
      startDate,
    );

    if (result.kind === 'auth-required') {
      sendError(res, 'FINTS_AUTH_REQUIRED');
    } else if (result.kind === 'error') {
      sendError(res, result.code, result.message);
    } else {
      sendData(res, result.data);
    }
  }),
);
