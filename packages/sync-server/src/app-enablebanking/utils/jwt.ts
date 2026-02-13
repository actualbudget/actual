import { sign } from 'jws';
import type { Header } from 'jws';

const getJWTHeader = (applicationId: string): Header => {
  return {
    typ: 'JWT',
    alg: 'RS256',
    kid: applicationId,
  };
};

const getJWTBody = (exp = 3600) => {
  const timestamp = Math.floor(new Date().getTime() / 1000);
  return {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: timestamp,
    exp: timestamp + exp,
  };
};

export const getJWT = (
  applicationId: string,
  secretKey: string,
  exp = 3600,
) => {
  const jwtHeaders = getJWTHeader(applicationId);
  const jwtBody = getJWTBody(exp);

  return sign({
    header: jwtHeaders,
    payload: jwtBody,
    secret: secretKey,
  });
};
