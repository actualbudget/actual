import express from 'express';

import { isAdmin } from './account-db';
import { SecretName, secretsService } from './services/secrets-service';
import * as UserService from './services/user-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares';

const app = express();

export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

function canManageGlobalSecrets(userId) {
  return isAdmin(userId);
}

function canManagePerBudgetFileSecrets(fileId, userId) {
  const { granted } = UserService.checkFilePermission(fileId, userId) || {
    granted: 0,
  };
  return isAdmin(userId) || granted > 0;
}

function sendGlobalAccessDenied(res) {
  res.status(403).send({
    status: 'error',
    reason: 'not-admin',
    details: 'You have to be admin to manage global secrets',
  });
}

function sendMissingFileId(res) {
  res.status(400).send({
    status: 'error',
    reason: 'missing-file-id',
    details: 'fileId is required',
  });
}

function sendFileAccessDenied(res) {
  res.status(403).send({
    status: 'error',
    reason: 'file-access-denied',
    details: "You don't have permissions over this file",
  });
}

app.post('/', async (req, res) => {
  const { name, value, fileId, perBudgetFile = true } = req.body || {};

  if (!(name in SecretName)) {
    res.status(400).send({
      status: 'error',
      reason: 'invalid-secret-name',
      details: 'Unknown secret name',
    });
    return;
  }

  if (value === null) {
    if (!fileId || typeof fileId !== 'string') {
      sendMissingFileId(res);
      return;
    }

    if (!canManagePerBudgetFileSecrets(fileId, res.locals.user_id)) {
      sendFileAccessDenied(res);
      return;
    }

    if (canManageGlobalSecrets(res.locals.user_id)) {
      secretsService.reset(name, { fileId });
    } else {
      secretsService.resetPerBudgetFile(name, { fileId });
    }
    res.status(200).send({ status: 'ok' });
    return;
  }

  if (perBudgetFile) {
    if (!fileId || typeof fileId !== 'string') {
      sendMissingFileId(res);
      return;
    }

    if (!canManagePerBudgetFileSecrets(fileId, res.locals.user_id)) {
      sendFileAccessDenied(res);
      return;
    }
  } else if (!canManageGlobalSecrets(res.locals.user_id)) {
    sendGlobalAccessDenied(res);
    return;
  }

  secretsService.set(name, value, { fileId, perBudgetFile });

  res.status(200).send({ status: 'ok' });
});

app.get('/:name', async (req, res) => {
  const name = req.params.name;
  if (!(name in SecretName)) {
    res.status(404).send('key not found');
    return;
  }

  const fileId = req.query.fileId || req.headers['x-actual-file-id'];
  if (!fileId || typeof fileId !== 'string') {
    sendMissingFileId(res);
    return;
  }

  if (!canManagePerBudgetFileSecrets(fileId, res.locals.user_id)) {
    sendFileAccessDenied(res);
    return;
  }

  const keyExists = secretsService.exists(name, { fileId });
  if (keyExists) {
    res.sendStatus(204);
  } else {
    res.status(404).send('key not found');
  }
});
