import { type ServerOptions } from 'https';

type LoginMethod = 'password' | 'header' | 'openid';

export type Config = {
  mode: 'test' | 'development';
  loginMethod?: LoginMethod;
  allowedLoginMethods: LoginMethod[];
  trustedProxies: string[];
  trustedAuthProxies?: string[];
  dataDir: string;
  projectRoot: string;
  port: number;
  hostname: string;
  serverFiles: string;
  userFiles: string;
  webRoot: string;
  https?: {
    key: string;
    cert: string;
  } & ServerOptions;
  upload?: {
    fileSizeSyncLimitMB: number;
    syncEncryptedFileSizeLimitMB: number;
    fileSizeLimitMB: number;
  };
  openId?: {
    issuer:
      | string
      | {
          name: string;
          authorization_endpoint: string;
          token_endpoint: string;
          userinfo_endpoint: string;
        };
    client_id: string;
    client_secret: string;
    server_hostname: string;
    authMethod?: 'openid' | 'oauth2';
  };
  token_expiration?: 'never' | 'openid-provider' | number;
  enforceOpenId: boolean;
  userCreationMode?: 'manual' | 'login';
};
