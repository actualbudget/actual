import { Message } from '../server/sync';
import { QueryState } from '../shared/query';

import { OpenIdConfig } from './models/openid';

export interface ServerHandlers {
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  'make-filters-from-conditions': (arg: {
    conditions: unknown;
    applySpecialCases?: boolean;
  }) => Promise<{ filters: unknown[] }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (query: QueryState) => Promise<{ data: any; dependencies: string[] }>;

  'get-did-bootstrap': () => Promise<boolean>;

  'subscribe-needs-bootstrap': (args: { url }) => Promise<
    | { error: string }
    | {
        bootstrapped: boolean;
        hasServer: false;
      }
    | {
        bootstrapped: boolean;
        hasServer: true;
        availableLoginMethods: {
          method: string;
          displayName: string;
          active: boolean;
        }[];
        multiuser: boolean;
      }
  >;

  'subscribe-get-login-methods': () => Promise<{
    methods?: { method: string; displayName: string; active: boolean }[];
    error?: string;
  }>;

  'subscribe-bootstrap': (arg: {
    password?: string;
    openId?: OpenIdConfig;
  }) => Promise<{ error?: string }>;

  'subscribe-get-user': () => Promise<{
    offline: boolean;
    userName?: string;
    userId?: string;
    displayName?: string;
    permission?: string;
    loginMethod?: string;
    tokenExpired?: boolean;
  } | null>;

  'subscribe-change-password': (arg: {
    password;
  }) => Promise<{ error?: string }>;

  'subscribe-sign-in': (
    arg:
      | {
          password;
          loginMethod?: string;
        }
      | {
          return_url;
          loginMethod?: 'openid';
        },
  ) => Promise<{ error?: string; redirect_url?: string }>;

  'subscribe-sign-out': () => Promise<'ok'>;

  'subscribe-set-token': (arg: { token: string }) => Promise<void>;

  'get-server-version': () => Promise<{ error?: string } | { version: string }>;

  'get-server-url': () => Promise<string | null>;

  'set-server-url': (arg: {
    url: string;
    validate?: boolean;
  }) => Promise<{ error?: string }>;

  sync: () => Promise<
    | { error: { message: string; reason: string; meta: unknown } }
    | { messages: Message[] }
  >;

  'app-focused': () => Promise<void>;

  'enable-openid': (arg: {
    openId?: OpenIdConfig;
  }) => Promise<{ error?: string }>;

  'enable-password': (arg: { password: string }) => Promise<{ error?: string }>;

  'get-openid-config': (arg: { password: string }) => Promise<
    | {
        openId: OpenIdConfig;
      }
    | { error: string }
    | null
  >;
}
