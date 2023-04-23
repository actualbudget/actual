import type { Handlers } from '../../../types/handlers';

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

export function listen(name: string, cb: () => void): () => void;
export type Listen = typeof listen;

export function unlisten(name: string): void;
export type Unlisten = typeof unlisten;
