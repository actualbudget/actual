import type { Handlers } from '../../../types/handlers';
import type { ServerEvents } from '../../../types/server-events';

export declare function init(worker: Worker): Promise<unknown>;
export type Init = typeof init;

export declare function send<K extends keyof Handlers>(
  name: K,
  args: Parameters<Handlers[K]>[0],
  options: { catchErrors: true },
): Promise<
  | { data: Awaited<ReturnType<Handlers[K]>>; error: undefined }
  | {
      data: undefined;
      error: { type: 'APIError' | 'InternalError'; message: string };
    }
>;
export declare function send<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
  options?: { catchErrors?: boolean },
): Promise<Awaited<ReturnType<Handlers[K]>>>;
export type Send = typeof send;

export declare function sendCatch<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
): Promise<
  | { data: Awaited<ReturnType<Handlers[K]>>; error: undefined }
  | {
      data: undefined;
      error: { type: 'APIError' | 'InternalError'; message: string };
    }
>;
export type SendCatch = typeof sendCatch;

export declare function listen<K extends keyof ServerEvents>(
  name: K,
  cb: (arg: ServerEvents[K]) => void,
): () => void;
export type Listen = typeof listen;

export declare function unlisten(name: string): void;
export type Unlisten = typeof unlisten;

/** Mock functions */
export declare function initServer(handlers: Partial<Handlers>): void;
export type InitServer = typeof initServer;

export declare function serverPush(name: string, args: unknown): void;
export type ServerPush = typeof serverPush;

export declare function clearServer(): Promise<void>;
export type ClearServer = typeof clearServer;
