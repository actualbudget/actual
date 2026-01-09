import express from 'express';

import { apiTokenService } from './services/api-token-service';
import { countUserAccess } from './services/user-service';
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
  if (res.locals.auth_method === 'api_token') {
    return res.status(403).send({
      status: 'error',
      reason: 'forbidden-auth-method',
      details: 'API tokens cannot manage other API tokens',
    });
  }

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

  // Validate each budgetId is a non-empty string and user has access
  for (const budgetId of budgetIds) {
    if (typeof budgetId !== 'string' || budgetId.trim() === '') {
      return res.status(400).send({
        status: 'error',
        reason: 'invalid-budget-id',
        details: 'Each budgetId must be a non-empty string',
      });
    }

    // Check that user has access to this budget
    const accessCount = countUserAccess(budgetId, userId);
    if (accessCount === 0) {
      return res.status(403).send({
        status: 'error',
        reason: 'forbidden-budget',
        details: `You do not have access to budget: ${budgetId}`,
      });
    }
  }

  if (expiresAt !== null && (typeof expiresAt !== 'number' || expiresAt < 0)) {
    return res.status(400).send({
      status: 'error',
      reason: 'invalid-expires-at',
      details: 'expiresAt must be a positive number (unix timestamp) or null',
    });
  }

  try {
    const result = await apiTokenService.createToken(
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
  if (res.locals.auth_method === 'api_token') {
    return res.status(403).send({
      status: 'error',
      reason: 'forbidden-auth-method',
      details: 'API tokens cannot manage other API tokens',
    });
  }

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
  if (res.locals.auth_method === 'api_token') {
    return res.status(403).send({
      status: 'error',
      reason: 'forbidden-auth-method',
      details: 'API tokens cannot manage other API tokens',
    });
  }

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
  if (res.locals.auth_method === 'api_token') {
    return res.status(403).send({
      status: 'error',
      reason: 'forbidden-auth-method',
      details: 'API tokens cannot manage other API tokens',
    });
  }

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
