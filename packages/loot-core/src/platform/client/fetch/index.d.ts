import type { Handlers } from '../../../types/handlers';
import type { CategoryGroupEntity } from '../../../types/models';
import type { ServerEvents } from '../../../types/server-events';

export function init(socketName: string): Promise<unknown>;
export type Init = typeof init;

export function send<K extends keyof Handlers>(
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
export function send<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
  options?: { catchErrors?: boolean },
): Promise<Awaited<ReturnType<Handlers[K]>>>;
export type Send = typeof send;

export function sendCatch<K extends keyof Handlers>(
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

export function listen<K extends keyof ServerEvents>(
  name: K,
  cb: (arg: ServerEvents[K]) => void,
): () => void;
export type Listen = typeof listen;

export function unlisten(name: string): void;
export type Unlisten = typeof unlisten;

/** Mock functions */
export function initServer(handlers: {
  query: (query: { table: string; selectExpressions: unknown }) => Promise<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    dependencies: string[];
  }>;
  getCell?: () => { value: number };
  'get-categories'?: () => { grouped: CategoryGroupEntity[] };
}): void;
export type InitServer = typeof initServer;

export function serverPush(name: string, args: unknown): void;
export type ServerPush = typeof serverPush;

export async function clearServer(): void;
export type ClearServer = typeof clearServer;
