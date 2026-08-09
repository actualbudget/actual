import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import {
  decodeClientDataJSON,
  isoBase64URL,
} from '@simplewebauthn/server/helpers';
import type { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { clearExpiredSessions, getAccountDb } from '#account-db';
import { config } from '#load-config';
import { TOKEN_EXPIRATION_NEVER } from '#util/validate-user';

const RP_NAME = 'Actual Budget';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const PENDING_CHALLENGE_TYPE = {
  registration: 'registration',
  authentication: 'authentication',
} as const;
type PendingChallengeType =
  (typeof PENDING_CHALLENGE_TYPE)[keyof typeof PENDING_CHALLENGE_TYPE];

type StoredWebAuthnCredential = {
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  rpID: string;
  deviceType: string;
  backedUp: boolean;
};

function getRpIdAndOrigin(req: Request): { rpID: string; origin: string } {
  return { rpID: req.hostname, origin: `${req.protocol}://${req.get('host')}` };
}

function storePendingChallenge(challenge: string, type: PendingChallengeType) {
  const accountDb = getAccountDb();
  const now = Date.now();
  accountDb.mutate(
    'DELETE FROM pending_webauthn_challenges WHERE expiry_time < ?',
    [now],
  );
  accountDb.mutate(
    'INSERT INTO pending_webauthn_challenges (challenge, type, expiry_time) VALUES (?, ?, ?)',
    [challenge, type, now + CHALLENGE_TTL_MS],
  );
}

function consumePendingChallenge(
  challenge: string,
  type: PendingChallengeType,
): boolean {
  const accountDb = getAccountDb();
  return accountDb.transaction(() => {
    const row = accountDb.first(
      'SELECT challenge FROM pending_webauthn_challenges WHERE challenge = ? AND type = ? AND expiry_time > ?',
      [challenge, type, Date.now()],
    );
    if (!row) return false;
    accountDb.mutate(
      'DELETE FROM pending_webauthn_challenges WHERE challenge = ?',
      [challenge],
    );
    return true;
  });
}

function getStoredCredential(): StoredWebAuthnCredential | null {
  const accountDb = getAccountDb();
  const row = accountDb.first(
    "SELECT extra_data FROM auth WHERE method = 'webauthn'",
  );
  if (!row || !row.extra_data) return null;
  try {
    return JSON.parse(row.extra_data);
  } catch (err) {
    console.error('Error parsing WebAuthn credential:', err);
    return null;
  }
}

function setStoredCredential(credential: StoredWebAuthnCredential) {
  const accountDb = getAccountDb();
  accountDb.transaction(() => {
    accountDb.mutate('DELETE FROM auth WHERE method = ?', ['webauthn']);
    accountDb.mutate('UPDATE auth SET active = 0');
    accountDb.mutate(
      "INSERT INTO auth (method, display_name, extra_data, active) VALUES ('webauthn', 'Passkey', ?, 1)",
      [JSON.stringify(credential)],
    );
  });
}

function decodeChallenge(clientDataJSON: string): string | null {
  try {
    return decodeClientDataJSON(clientDataJSON).challenge;
  } catch (err) {
    console.error('Error decoding WebAuthn clientDataJSON:', err);
    return null;
  }
}

export async function getRegistrationOptions(
  req: Request,
): Promise<
  { error: string } | { options: PublicKeyCredentialCreationOptionsJSON }
> {
  const { rpID } = getRpIdAndOrigin(req);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: 'admin',
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  storePendingChallenge(options.challenge, PENDING_CHALLENGE_TYPE.registration);

  return { options };
}

export async function verifyRegistration(
  req: Request,
  response: RegistrationResponseJSON,
): Promise<{ error: string } | Record<string, never>> {
  if (!response?.response?.clientDataJSON) {
    return { error: 'invalid-response' };
  }

  const { rpID, origin } = getRpIdAndOrigin(req);

  const challenge = decodeChallenge(response.response.clientDataJSON);
  if (!challenge) {
    return { error: 'invalid-response' };
  }

  if (
    !consumePendingChallenge(challenge, PENDING_CHALLENGE_TYPE.registration)
  ) {
    return { error: 'invalid-or-expired-challenge' };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (err) {
    console.error('Error verifying WebAuthn registration:', err);
    return { error: 'verification-failed' };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: 'verification-failed' };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  setStoredCredential({
    credentialID: credential.id,
    credentialPublicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
    rpID,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  });

  return {};
}

export async function getAuthenticationOptions(
  req: Request,
): Promise<
  { error: string } | { options: PublicKeyCredentialRequestOptionsJSON }
> {
  const credential = getStoredCredential();
  if (!credential) {
    return { error: 'webauthn-not-configured' };
  }

  const { rpID } = getRpIdAndOrigin(req);

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [
      { id: credential.credentialID, transports: credential.transports },
    ],
    userVerification: 'preferred',
  });

  storePendingChallenge(
    options.challenge,
    PENDING_CHALLENGE_TYPE.authentication,
  );

  return { options };
}

export async function verifyAuthentication(
  req: Request,
  response: AuthenticationResponseJSON,
): Promise<{ error: string } | { token: string }> {
  if (!response?.response?.clientDataJSON) {
    return { error: 'invalid-response' };
  }

  const credential = getStoredCredential();
  if (!credential) {
    return { error: 'webauthn-not-configured' };
  }

  const { rpID, origin } = getRpIdAndOrigin(req);

  if (credential.rpID !== rpID) {
    return { error: 'rp-id-mismatch' };
  }

  const challenge = decodeChallenge(response.response.clientDataJSON);
  if (!challenge) {
    return { error: 'invalid-response' };
  }

  if (
    !consumePendingChallenge(challenge, PENDING_CHALLENGE_TYPE.authentication)
  ) {
    return { error: 'invalid-or-expired-challenge' };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialID,
        publicKey: isoBase64URL.toBuffer(credential.credentialPublicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
    });
  } catch (err) {
    console.error('Error verifying WebAuthn authentication:', err);
    return { error: 'verification-failed' };
  }

  if (!verification.verified) {
    return { error: 'verification-failed' };
  }

  const accountDb = getAccountDb();

  accountDb.mutate("UPDATE auth SET extra_data = ? WHERE method = 'webauthn'", [
    JSON.stringify({
      ...credential,
      counter: verification.authenticationInfo.newCounter,
    }),
  ]);

  // Mint/reuse a session exactly like loginWithPassword does.
  const sessionRow = accountDb.first(
    'SELECT * FROM sessions WHERE auth_method = ?',
    ['webauthn'],
  );

  const token = sessionRow ? sessionRow.token : uuidv4();

  const { totalOfUsers } = accountDb.first(
    'SELECT count(*) as totalOfUsers FROM users',
  );

  let userId = null;
  if (totalOfUsers === 0) {
    userId = uuidv4();
    accountDb.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
      [userId, '', '', 'ADMIN'],
    );
  } else {
    const { id: userIdFromDb } =
      accountDb.first('SELECT id FROM users WHERE user_name = ?', ['']) || {};
    userId = userIdFromDb;

    if (!userId) {
      return { error: 'user-not-found' };
    }
  }

  let expiration = TOKEN_EXPIRATION_NEVER;
  if (
    config.get('token_expiration') !== 'never' &&
    config.get('token_expiration') !== 'openid-provider' &&
    typeof config.get('token_expiration') === 'number'
  ) {
    expiration =
      Math.floor(Date.now() / 1000) +
      Number(config.get('token_expiration')) * 60;
  }

  if (!sessionRow) {
    accountDb.mutate(
      'INSERT INTO sessions (token, expires_at, user_id, auth_method) VALUES (?, ?, ?, ?)',
      [token, expiration, userId, 'webauthn'],
    );
  } else {
    accountDb.mutate(
      'UPDATE sessions SET user_id = ?, expires_at = ? WHERE token = ?',
      [userId, expiration, token],
    );
  }

  clearExpiredSessions();

  return { token };
}

export function resetWebAuthnCredential() {
  const accountDb = getAccountDb();
  accountDb.transaction(() => {
    accountDb.mutate("DELETE FROM auth WHERE method = 'webauthn'");
    accountDb.mutate("DELETE FROM sessions WHERE auth_method = 'webauthn'");
  });
}
