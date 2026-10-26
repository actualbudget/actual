// Attaches an uploaded build to an App Store version and submits it for
// review. Used by the publish-ios and publish-mac-app-store workflows on a
// published release. Safe to re-run: an existing version, draft submission or
// an already submitted version is reused or left alone.
//
// Environment:
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH  App Store Connect API key
//   BUNDLE_ID                                 e.g. com.actualbudget.actual
//   PLATFORM                                  IOS or MAC_OS
//   VERSION                                   CFBundleShortVersionString, e.g. 26.10.0
//   BUILD_NUMBER                              CFBundleVersion of the uploaded build
//   WHATS_NEW                                 optional release notes (markdown ok)
//   DRY_RUN                                   set to skip every write request
import { createPrivateKey, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const env = name => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const KEY_ID = env('ASC_KEY_ID');
const ISSUER_ID = env('ASC_ISSUER_ID');
const PRIVATE_KEY = createPrivateKey(readFileSync(env('ASC_KEY_PATH'), 'utf8'));
const BUNDLE_ID = env('BUNDLE_ID');
const PLATFORM = env('PLATFORM');
const VERSION = env('VERSION');
const BUILD_NUMBER = env('BUILD_NUMBER');
const DRY_RUN = Boolean(process.env.DRY_RUN);

const BUILD_PROCESSING_TIMEOUT_MS = 45 * 60 * 1000;
const WHATS_NEW_MAX_LENGTH = 4000;
const WHATS_NEW_FALLBACK =
  'Bug fixes and improvements. Full release notes: https://actualbudget.org/docs/releases';

const base64url = value => Buffer.from(value).toString('base64url');

// Tokens are short-lived, so a fresh one is minted for every request; the
// build-processing wait alone can outlast a token.
function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }),
  );
  const payload = base64url(
    JSON.stringify({
      iss: ISSUER_ID,
      iat: now,
      exp: now + 600,
      aud: 'appstoreconnect-v1',
    }),
  );
  const der = createSign('SHA256')
    .update(`${header}.${payload}`)
    .sign(PRIVATE_KEY);
  // DER-encoded ECDSA signature -> raw r||s as JWT expects.
  const parts = [];
  let offset = 2;
  for (let i = 0; i < 2; i++) {
    const length = der[offset + 1];
    let int = der.subarray(offset + 2, offset + 2 + length);
    int =
      int.length > 32
        ? int.subarray(int.length - 32)
        : Buffer.concat([Buffer.alloc(32 - int.length), int]);
    parts.push(int);
    offset += 2 + length;
  }
  return `${header}.${payload}.${Buffer.concat(parts).toString('base64url')}`;
}

async function api(method, path, body) {
  if (DRY_RUN && method !== 'GET') {
    console.log(
      `[dry run] ${method} ${path} ${body ? JSON.stringify(body) : ''}`,
    );
    return { data: { id: 'dry-run', attributes: {} } };
  }
  const response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed with ${response.status}: ${text}`,
    );
  }
  return text ? JSON.parse(text) : {};
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function releaseNotes() {
  const raw = (process.env.WHATS_NEW ?? '')
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
    .replace(/^#+\s*/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!raw) return WHATS_NEW_FALLBACK;
  return raw.length > WHATS_NEW_MAX_LENGTH
    ? `${raw.slice(0, WHATS_NEW_MAX_LENGTH - 1)}…`
    : raw;
}

async function findApp() {
  const { data } = await api('GET', `/v1/apps?filter[bundleId]=${BUNDLE_ID}`);
  if (data.length !== 1) {
    throw new Error(`Expected one app for ${BUNDLE_ID}, found ${data.length}`);
  }
  return data[0].id;
}

async function waitForBuild(appId) {
  const deadline = Date.now() + BUILD_PROCESSING_TIMEOUT_MS;
  for (;;) {
    const { data } = await api(
      'GET',
      `/v1/builds?filter[app]=${appId}&filter[preReleaseVersion.platform]=${PLATFORM}&filter[preReleaseVersion.version]=${VERSION}&filter[version]=${BUILD_NUMBER}&limit=1`,
    );
    const build = data[0];
    const state = build?.attributes.processingState;
    console.log(
      `Build ${VERSION} (${BUILD_NUMBER}) on ${PLATFORM}: ${state ?? 'not listed yet'}`,
    );
    if (state === 'VALID') return build.id;
    if (state === 'FAILED' || state === 'INVALID') {
      throw new Error(`Build processing ended in state ${state}`);
    }
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for build processing');
    }
    await sleep(60 * 1000);
  }
}

const EDITABLE_STATES = new Set([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
]);

async function findOrCreateVersion(appId) {
  const { data } = await api(
    'GET',
    `/v1/apps/${appId}/appStoreVersions?filter[platform]=${PLATFORM}&filter[versionString]=${VERSION}`,
  );
  if (data.length > 0) {
    const version = data[0];
    const state =
      version.attributes.appVersionState ?? version.attributes.appStoreState;
    console.log(`App Store version ${VERSION} exists in state ${state}`);
    if (!EDITABLE_STATES.has(state)) {
      console.log('Version is already submitted or released; nothing to do.');
      return null;
    }
    return version.id;
  }
  console.log(`Creating App Store version ${VERSION}`);
  const created = await api('POST', '/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: {
        platform: PLATFORM,
        versionString: VERSION,
        releaseType: 'AFTER_APPROVAL',
      },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });
  return created.data.id;
}

async function setReleaseNotes(versionId) {
  const whatsNew = releaseNotes();
  const { data } = await api(
    'GET',
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
  );
  if (data.length === 0) {
    console.log('No localizations on this version; creating en-US');
    await api('POST', '/v1/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: 'en-US', whatsNew },
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: versionId },
          },
        },
      },
    });
    return;
  }
  for (const localization of data) {
    await api('PATCH', `/v1/appStoreVersionLocalizations/${localization.id}`, {
      data: {
        type: 'appStoreVersionLocalizations',
        id: localization.id,
        attributes: { whatsNew },
      },
    });
    console.log(`Set release notes for ${localization.attributes.locale}`);
  }
}

async function attachBuild(versionId, buildId) {
  await api('PATCH', `/v1/appStoreVersions/${versionId}/relationships/build`, {
    data: { type: 'builds', id: buildId },
  });
  console.log(`Attached build ${BUILD_NUMBER} to version ${VERSION}`);
}

async function submitForReview(appId, versionId) {
  const { data } = await api(
    'GET',
    `/v1/apps/${appId}/reviewSubmissions?filter[platform]=${PLATFORM}&filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW,UNRESOLVED_ISSUES`,
  );
  const open = data[0];
  if (open && open.attributes.state !== 'READY_FOR_REVIEW') {
    console.log(
      `A review submission is already ${open.attributes.state}; nothing to do.`,
    );
    return;
  }
  let submissionId = open?.id;
  if (!submissionId) {
    const created = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: PLATFORM },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    submissionId = created.data.id;
  }
  const items = await api('GET', `/v1/reviewSubmissions/${submissionId}/items`);
  const hasVersion = (items.data ?? []).some(
    item => item.relationships?.appStoreVersion?.data?.id === versionId,
  );
  if (!hasVersion) {
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: {
            data: { type: 'reviewSubmissions', id: submissionId },
          },
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: versionId },
          },
        },
      },
    });
  }
  await api('PATCH', `/v1/reviewSubmissions/${submissionId}`, {
    data: {
      type: 'reviewSubmissions',
      id: submissionId,
      attributes: { submitted: true },
    },
  });
  console.log(`Submitted ${VERSION} on ${PLATFORM} for App Store review`);
}

const appId = await findApp();
const buildId = await waitForBuild(appId);
const versionId = await findOrCreateVersion(appId);
if (versionId) {
  await attachBuild(versionId, buildId);
  await setReleaseNotes(versionId);
  await submitForReview(appId, versionId);
}
