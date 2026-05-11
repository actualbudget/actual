import { sign } from 'jws';
import type { Algorithm } from 'jws';

type Header = { typ: string; alg: Algorithm; kid: string };

type JWTPayload = {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

function getJWTHeader(applicationId: string): Header {
  return { typ: 'JWT', alg: 'RS256', kid: applicationId };
}

function getJWTBody(exp = 3600): JWTPayload {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: timestamp,
    exp: timestamp + exp,
  };
}

export function getJWT(
  applicationId: string,
  secretKey: string,
  exp = 3600,
): string {
  return sign({
    header: getJWTHeader(applicationId),
    payload: getJWTBody(exp),
    secret: secretKey,
  });
}
