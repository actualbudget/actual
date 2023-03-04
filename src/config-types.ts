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
  nordigen_secret_id?: string;
  nordigen_secret_key?: string;
}
