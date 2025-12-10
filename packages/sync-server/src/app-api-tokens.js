import express from 'express';

import { apiTokenService } from './services/api-token-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares';

const app = express();

export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

// Create a new API token
app.post('/', async (req, res) => {
  const userId = res.locals.user_id;
  const { name, budgetIds = [], expiresAt = null } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).send({
      status: 'error',
      reason: 'invalid-name',
      details: 'Token name is required',
    });
  }

  if (!Array.isArray(budgetIds)) {
    return res.status(400).send({
      status: 'error',
      reason: 'invalid-budget-ids',
      details: 'budgetIds must be an array',
    });
  }

  if (expiresAt !== null && (typeof expiresAt !== 'number' || expiresAt < 0)) {
    return res.status(400).send({
      status: 'error',
      reason: 'invalid-expires-at',
      details: 'expiresAt must be a positive number (unix timestamp) or null',
    });
  }

  try {
    const result = apiTokenService.createToken(
      userId,
      name.trim(),
      budgetIds,
      expiresAt,
    );

    res.status(201).send({
      status: 'ok',
      data: {
        id: result.id,
        token: result.token, // Only returned on creation
        prefix: result.prefix,
        name: result.name,
        budgetIds: result.budgetIds,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    console.error('Failed to create API token:', error);
    res.status(500).send({
      status: 'error',
      reason: 'internal-error',
      details: 'Failed to create API token',
    });
  }
});

// List all API tokens for the current user
app.get('/', async (req, res) => {
  const userId = res.locals.user_id;

  try {
    const tokens = apiTokenService.listTokens(userId);

    res.status(200).send({
      status: 'ok',
      data: tokens,
    });
  } catch (error) {
    console.error('Failed to list API tokens:', error);
    res.status(500).send({
      status: 'error',
      reason: 'internal-error',
      details: 'Failed to list API tokens',
    });
  }
});

// Revoke (delete) an API token
app.delete('/:id', async (req, res) => {
  const userId = res.locals.user_id;
  const tokenId = req.params.id;

  if (!tokenId) {
    return res.status(400).send({
      status: 'error',
      reason: 'invalid-token-id',
      details: 'Token ID is required',
    });
  }

  try {
    const deleted = apiTokenService.revokeToken(tokenId, userId);

    if (!deleted) {
      return res.status(404).send({
        status: 'error',
        reason: 'not-found',
        details: 'Token not found or you do not have permission to delete it',
      });
    }

    res.status(200).send({
      status: 'ok',
    });
  } catch (error) {
    console.error('Failed to revoke API token:', error);
    res.status(500).send({
      status: 'error',
      reason: 'internal-error',
      details: 'Failed to revoke API token',
    });
  }
});

// Enable or disable an API token
app.patch('/:id', async (req, res) => {
  const userId = res.locals.user_id;
  const tokenId = req.params.id;
  const { enabled } = req.body || {};

  if (!tokenId) {
    return res.status(400).send({
      status: 'error',
      reason: 'invalid-token-id',
      details: 'Token ID is required',
    });
  }

  if (typeof enabled !== 'boolean') {
    return res.status(400).send({
      status: 'error',
      reason: 'invalid-enabled',
      details: 'enabled must be a boolean',
    });
  }

  try {
    const updated = apiTokenService.setTokenEnabled(tokenId, userId, enabled);

    if (!updated) {
      return res.status(404).send({
        status: 'error',
        reason: 'not-found',
        details: 'Token not found or you do not have permission to update it',
      });
    }

    res.status(200).send({
      status: 'ok',
    });
  } catch (error) {
    console.error('Failed to update API token:', error);
    res.status(500).send({
      status: 'error',
      reason: 'internal-error',
      details: 'Failed to update API token',
    });
  }
});
