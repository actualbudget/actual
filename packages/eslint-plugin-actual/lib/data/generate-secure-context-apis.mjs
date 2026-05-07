#!/usr/bin/env node
// Generates secure-context-apis.json — the deny list consumed by the
// `actual/no-secure-context-apis` lint rule.
//
// Source 1: @mdn/browser-compat-data. Each BCD feature can carry a
// `secure_context_required` *subfeature* (a child key whose presence means
// "this feature is gated to secure contexts"). See
// https://github.com/mdn/browser-compat-data/issues/190. We walk `api.*`
// and collect entries that have one, translating their BCD path into a JS
// global access path via the SEEDS map below.
//
// Source 2: a small manual augment list. BCD's secure-context coverage is
// incomplete (issue tracked at https://github.com/mdn/browser-compat-data/issues/4696
// since 2020). Notably, `crypto.randomUUID` — the API that motivated this
// rule (actualbudget/actual#7715) — is not currently tagged. The augment
// list covers known gaps until BCD catches up.
//
// Usage:
//   node generate-secure-context-apis.mjs           # write the file
//   node generate-secure-context-apis.mjs --check   # exit 1 if file would change

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const bcd = require('@mdn/browser-compat-data');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, 'secure-context-apis.json');

// Map a BCD interface name (the first segment after `api.`) to the JS
// global access path through which it is reached. Interfaces NOT in this
// map are skipped — most BCD interfaces aren't directly reachable from a
// browser global (they're return values of other APIs) and would produce
// false positives.
const SEEDS = {
  // Top-level globals
  caches: 'caches',
  Cache: 'Cache',
  Notification: 'Notification',
  PaymentRequest: 'PaymentRequest',
  PaymentManager: 'PaymentManager',
  PublicKeyCredential: 'PublicKeyCredential',
  SharedWorker: 'SharedWorker',
  PushManager: 'PushManager',
  PushSubscription: 'PushSubscription',
  EyeDropper: 'EyeDropper',
  Gamepad: 'Gamepad',
  GamepadButton: 'GamepadButton',
  GamepadEvent: 'GamepadEvent',
  GamepadHapticActuator: 'GamepadHapticActuator',
  GamepadPose: 'GamepadPose',
  NDEFMessage: 'NDEFMessage',
  NDEFReader: 'NDEFReader',
  NDEFReadingEvent: 'NDEFReadingEvent',
  NDEFRecord: 'NDEFRecord',
  PaymentRequestUpdateEvent: 'PaymentRequestUpdateEvent',
  PresentationRequest: 'PresentationRequest',
  BatteryManager: 'BatteryManager',
  ServiceWorker: 'ServiceWorker',
  ServiceWorkerRegistration: 'ServiceWorkerRegistration',

  // Reached through `crypto.*`
  Crypto: 'crypto',
  SubtleCrypto: 'crypto.subtle',

  // Reached through `navigator.*`
  Navigator: 'navigator',
  Clipboard: 'navigator.clipboard',
  ClipboardItem: 'ClipboardItem',
  ServiceWorkerContainer: 'navigator.serviceWorker',
  MediaDevices: 'navigator.mediaDevices',
  Bluetooth: 'navigator.bluetooth',
  USB: 'navigator.usb',
  HID: 'navigator.hid',
  Serial: 'navigator.serial',
  WakeLock: 'navigator.wakeLock',
  CredentialsContainer: 'navigator.credentials',
  StorageManager: 'navigator.storage',
  LockManager: 'navigator.locks',
  Geolocation: 'navigator.geolocation',
  GeolocationCoordinates: 'navigator.geolocation',
  GeolocationPosition: 'navigator.geolocation',
  GeolocationPositionError: 'navigator.geolocation',
};

// Manual augment list for APIs that ARE secure-context-only per spec/MDN
// but aren't yet tagged in BCD. Keep this list short; prefer fixing BCD
// upstream when possible. Each entry must be a JS global access path that
// matches the lint rule's chain matcher.
const MANUAL_AUGMENT = [
  // crypto.randomUUID requires a secure context per the WebCrypto spec; the
  // entire reason this rule exists. https://github.com/actualbudget/actual/issues/7715
  'crypto.randomUUID',
  // The Async Clipboard API requires a secure context.
  'navigator.clipboard',
  // ServiceWorkerContainer access requires a secure context.
  'navigator.serviceWorker',
  // Web Locks API.
  'navigator.locks',
  // Storage Manager (estimate/persist/persisted).
  'navigator.storage',
  // Credential Management.
  'navigator.credentials',
  // Wake Lock.
  'navigator.wakeLock',
  // WebHID, WebUSB, WebSerial, Web Bluetooth — covered by BCD interface
  // tags via SEEDS but listed here too in case a member is accessed in a
  // way that bypasses the interface root match.
  'navigator.bluetooth',
  'navigator.usb',
  'navigator.hid',
  'navigator.serial',
];

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function hasSecureContextRequired(node) {
  return Boolean(
    node && typeof node === 'object' && node.secure_context_required,
  );
}

// Walk a BCD subtree starting at `node`. `bcdPathSegments` is the path so
// far (excluding the `api` root and the interface root). Calls `visit` for
// every entry that requires a secure context.
function walk(node, bcdPathSegments, visit) {
  if (!node || typeof node !== 'object') return;

  if (hasSecureContextRequired(node)) {
    visit(bcdPathSegments);
  }

  for (const key of Object.keys(node)) {
    if (key === '__compat') continue;
    if (key === 'secure_context_required') continue;
    if (key.endsWith('_event') || key.endsWith('_static')) continue;
    if (!IDENT_RE.test(key)) continue;

    const child = node[key];
    if (!child || typeof child !== 'object') continue;
    walk(child, [...bcdPathSegments, key], visit);
  }
}

function generate() {
  const output = new Set(MANUAL_AUGMENT);

  for (const [iface, accessPath] of Object.entries(SEEDS)) {
    const ifaceNode = bcd.api[iface];
    if (!ifaceNode) continue;

    walk(ifaceNode, [], segments => {
      const memberPath = segments.length
        ? `${accessPath}.${segments.join('.')}`
        : accessPath;
      output.add(memberPath);
    });
  }

  return [...output].sort();
}

function format(list) {
  return JSON.stringify(list, null, 2) + '\n';
}

const generated = format(generate());

if (process.argv.includes('--check')) {
  let existing = '';
  try {
    existing = readFileSync(OUTPUT_PATH, 'utf8');
  } catch {
    // file missing => drift
  }
  if (existing !== generated) {
    process.stderr.write(
      `secure-context-apis.json is out of date.\n` +
        `Run \`yarn workspace eslint-plugin-actual run generate:secure-context-list\` and commit the result.\n`,
    );
    process.exit(1);
  }
} else {
  writeFileSync(OUTPUT_PATH, generated);
}
