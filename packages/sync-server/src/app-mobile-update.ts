import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'path';

import express, { Request, Response } from 'express';

import { cache } from './util/cache.js';
import {
  errorMiddleware,
  requestLoggerMiddleware,
} from './util/middlewares.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.dirname(__dirname);
const bundleFsPath = path.join(projectRoot, 'mobile-bundle.zip');
export const bundleMetadataFsPath = path.join(
  projectRoot,
  'mobile-bundle.json',
);

type BundleConfig = {
  version: string | null;
  checksum: string | null;
  path: string | null;
};

export const getBundleConfig = cache((): BundleConfig => {
  try {
    const raw = fs.readFileSync(bundleMetadataFsPath, 'utf-8');
    const config: Record<string, string> = JSON.parse(raw);
    return {
      version: config.bundle || null,
      checksum: config.checksum || null,
      path: '/mobile/bundle.zip',
    };
  } catch (_err) {
    return { version: null, checksum: null, path: null };
  }
});

// This endpoint implements a minimal self-hosted Capgo auto-update API.
// Reference: https://capgo.app/docs/plugins/updater/self-hosted/auto-update/
// The client performs a POST with a JSON body (AppInfos). We only care about `version_name`.
// We ALWAYS trigger an update when the client's version does not exactly match
// the server version (allowing forced downgrade scenarios).
// Response when update required:
// { version: <semver>, url: <zip-url>, checksum: <sha256> }
// If no update, we respond with an empty object.
// If server not configured with bundleUrl/checksum we return a message so plugin skips update.

const app = express();
app.use(requestLoggerMiddleware);

// Ordering matters; don't apply JSON middleware here.
app.get('/bundle.zip', (_req: Request, res: Response): void => {
  res.sendFile(bundleFsPath);
});

// Apply JSON middleware to remaining routes.
app.use(express.json());
app.use(express.urlencoded({ extended: true, type: 'application/json' }));

app.post('/auto-update', (req: Request, res: Response): void => {
  const { version, checksum, path } = getBundleConfig();

  if (!version || !checksum || !path) {
    res.status(200).json({
      message: 'mobile update bundle not configured on server',
      error: 'not-configured',
    });
    return;
  }

  if (!req.body) {
    res
      .status(400)
      .json({ message: 'missing request body', error: 'bad-request' });
    return;
  }

  // Body is the Capgo AppInfos object. We only need version_name and custom_id.
  let expectedServerHostname = (req.body.custom_id as string) || '';

  if (!expectedServerHostname || !expectedServerHostname.includes('://')) {
    res.status(400).json({
      message: 'could not determine server hostname from request',
      error: 'bad-request',
    });
    return;
  }
  if (expectedServerHostname.endsWith('/')) {
    expectedServerHostname = expectedServerHostname.slice(0, -1);
  }

  res.status(200).json({
    version,
    url: expectedServerHostname + path,
    checksum,
  });
});

app.use(errorMiddleware);

export { app as handlers };
