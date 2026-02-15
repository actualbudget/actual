// @ts-strict-ignore
import { captureBreadcrumb, captureException } from '../platform/exceptions';
import { sequential } from '../shared/async';
import type { HandlerFunctions, Handlers } from '../types/handlers';

const runningMethods = new Set();

let currentContext = null;
const mutatingMethods = new WeakMap();
let globalMutationsEnabled = false;

let _latestHandlerNames = [];

export function mutator<T extends HandlerFunctions>(handler: T): T {
  mutatingMethods.set(handler, true);
  return handler;
}

export function isMutating(handler) {
  return mutatingMethods.has(handler);
}

async function flushRunningMethods() {
  // Give the client some time to invoke new requests
  await wait(200);

  while (runningMethods.size > 0) {
    // Wait for all of them
    await Promise.all([...runningMethods.values()]);

    // We give clients more time to make other requests. This lets them continue
    // to do an async workflow
    await wait(100);
  }
}

function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export async function runHandler<T extends Handlers[keyof Handlers]>(
  handler: T,
  args?: Parameters<T>[0],
  { undoTag, name }: { undoTag?; name? } = {},
): Promise<ReturnType<T>> {
  // For debug reasons, track the latest handlers that have been
  // called
  _latestHandlerNames.push(name);
  if (_latestHandlerNames.length > 5) {
    _latestHandlerNames = _latestHandlerNames.slice(-5);
  }

  if (mutatingMethods.has(handler)) {
    return runMutator(() => handler(args), { undoTag }) as Promise<
      ReturnType<T>
    >;
  }

  // When closing a file, it clears out all global state for the file. That
  // means any async workflows currently executed would be cut off. We handle
  // this by letting all async workflows finish executing before closing the
  // file
  if (name === 'close-budget') {
    await flushRunningMethods();
  }

  const promise = handler(args);
  runningMethods.add(promise);
  promise.then(() => {
    runningMethods.delete(promise);
  });
  return promise as Promise<ReturnType<T>>;
}

// These are useful for tests. Only use them in tests.
export function enableGlobalMutations() {
  if (process.env.NODE_ENV === 'test') {
    globalMutationsEnabled = true;
  }
}

export function disableGlobalMutations() {
  if (process.env.NODE_ENV === 'test') {
    globalMutationsEnabled = false;
  }
}

function _runMutator<T extends () => Promise<unknown>>(
  func: T,
  initialContext = {},
): Promise<Awaited<ReturnType<T>>> {
  currentContext = initialContext;
  return func().finally(() => {
    currentContext = null;
  }) as Promise<Awaited<ReturnType<T>>>;
}
// Type cast needed as TS looses types over nested generic returns
export const runMutator = sequential(_runMutator) as typeof _runMutator;

export function withMutatorContext<T>(
  context: { undoListening: boolean; undoTag?: unknown },
  func: () => Promise<T>,
): Promise<T> {
  if (currentContext == null && !globalMutationsEnabled) {
    captureBreadcrumb('Recent methods: ' + _latestHandlerNames.join(', '));
    captureException(new Error('withMutatorContext: mutator not running'));

    // See comment below. This is not an error right now, but it will
    // be in the future.
    return func();
  }

  const prevContext = currentContext;
  currentContext = { ...currentContext, ...context };
  return func().finally(() => {
    currentContext = prevContext;
  });
}

export function getMutatorContext() {
  if (currentContext == null) {
    captureBreadcrumb({
      category: 'server',
      message: 'Recent methods: ' + _latestHandlerNames.join(', '),
    });
    // captureException(new Error('getMutatorContext: mutator not running'));

    // For now, this is a non-fatal error. It will be in the future,
    // but this is relatively non-critical (undo just won't work) so
    // return an empty context. When we have more confidence that
    // everything is running inside a mutator, throw an error.
    return {};
  }

  if (currentContext == null && globalMutationsEnabled) {
    return {};
  }
  return currentContext;
}
