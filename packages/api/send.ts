// The transport seam between methods.ts and the backend. The Node entry wires
// it to loot-core's in-process `lib.send`; the browser entry wires it to the
// client connection (postMessage to the backend Worker).

import type { Handlers } from '@actual-app/core/types/handlers';

export type SendFn = <K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
) => Promise<Awaited<ReturnType<Handlers[K]>>>;

let impl: SendFn = () =>
  Promise.reject(
    new Error('@actual-app/api: call init() before any other method'),
  );

export const send: SendFn = (name, args) => impl(name, args);

export function _setSend(fn: SendFn) {
  impl = fn;
}
