import type { Handlers } from '../../../types/handlers';
import type { ServerEvents } from '../../../types/server-events';

export function init(socketName: string): Promise<unknown>;
export type Init = typeof init;

export function send<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
  options?: { catchErrors?: boolean },
): ReturnType<Handlers[K]>;
export type Send = typeof send;

export function sendCatch<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
): ReturnType<Handlers[K]>;
export type SendCatch = typeof sendCatch;

export function listen<K extends keyof ServerEvents>(
  name: K,
  cb: (arg: ServerEvents[K]) => void,
): () => void;
export type Listen = typeof listen;

export function unlisten(name: string): void;
export type Unlisten = typeof unlisten;

/** Mock functions */
export function initServer(handlers: unknown): void;
export type InitServer = typeof initServer;

export function serverPush(name: string, args: unknown): void;
export type ServerPush = typeof serverPush;

export async function clearServer(): void;
export type ClearServer = typeof clearServer;
