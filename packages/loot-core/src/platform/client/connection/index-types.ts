import type { Handlers } from '../../../types/handlers';
import type { ServerEvents } from '../../../types/server-events';

export declare function init(): Promise<unknown>;
export type Init = typeof init;

/**
 * Send a command to the browser server.
 *
 * @param name The name of the command to be executed by the browser server.
 * @param args The command arguments.
 * @param options The options for the command. If `catchErrors` is true,
 * and an error occurs, the promise will be resolved with an object that
 * has an `error` property. Otherwise, the promise will be rejected with the error.
 * @returns A promise that resolves with the command result, or rejects with an error if one occurs.
 * If you want to catch errors as part of the resolved value instead of rejecting, use `sendCatch` instead.
 */
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

/**
 * Send a command to the browser server.
 *
 * @param name The name of the command to be executed by the browser server.
 * @param args The command arguments.
 * @returns A promise that resolves with an object containing either the command result or an error if one occurs.
 * The promise will never reject, as errors are caught and returned as part of the resolved value.
 */
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

/** Server push listeners */

/**
 * Listen to events pushed to the client from the browser server.
 *
 * @param name The name of the event to listen to.
 * @param cb The callback to be called when the event is received.
 * @returns A function that can be called to unregister the listener.
 */
export declare function listen<K extends keyof ServerEvents>(
  name: K,
  cb: (arg: ServerEvents[K]) => void,
): () => void;
export type Listen = typeof listen;

/**
 * Stop listening to events pushed to the client from the browser server.
 *
 * @param name The name of the event to stop listening to.
 */
export declare function unlisten(name: string): void;
export type Unlisten = typeof unlisten;

/** Mock functions */
export declare function initServer(handlers: Partial<Handlers>): void;
export type InitServer = typeof initServer;

export declare function serverPush(name: string, args: unknown): void;
export type ServerPush = typeof serverPush;

export declare function clearServer(): Promise<void>;
export type ClearServer = typeof clearServer;
