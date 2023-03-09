import { ServerOptions } from 'https';

export interface Config {
  mode: 'test' | 'development';
  port: number;
  hostname: string;
  serverFiles: string;
  userFiles: string;
  webRoot: string;
  https?: {
    key: string;
    cert: string;
  } & ServerOptions;
  nordigen?: {
    secretId: string;
    secretKey: string;
  };
}
