export function init(
  channel: Window | string,
  handlers: Record<string, () => void>,
): void;
export type Init = typeof init;

export function send(type: string, args?: unknown): void;
export type Send = typeof send;

export function getEvents(): unknown[];
export type GetEvents = typeof getEvents;

export function getNumClients(): void;
export type GetNumClients = typeof getNumClients;

export function resetEvents(): void;
export type ResetEvents = typeof resetEvents;
