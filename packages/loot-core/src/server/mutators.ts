// @ts-strict-ignore
import { captureException, captureBreadcrumb } from '../platform/exceptions';
import { sequential } from '../shared/async';
import { type HandlerFunctions, type Handlers } from '../types/handlers';

const runningMethods = new Set();

// `currentContext` will hold the application-specific context object
// (e.g., the 'initial' object with undo/redo methods) provided by the caller
// of `runHandler`, potentially augmented by `withMutatorContext`.
let currentContext: object | null = null;
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
  // `mutatorContext` is the application-specific context (e.g., the 'initial' object)
  // that will be made available to mutators via `getMutatorContext`.
  // It's typed as `object` here to keep this core infrastructure file generic.
  {
    undoTag,
    name,
    mutatorContext,
  }: { undoTag?: unknown; name?: string; mutatorContext?: object } = {},
): Promise<ReturnType<T>> {
  // For debug reasons, track the latest handlers that have been
  // called
  _latestHandlerNames.push(name);
  if (_latestHandlerNames.length > 5) {
    _latestHandlerNames = _latestHandlerNames.slice(-5);
  }

  if (mutatingMethods.has(handler)) {
    // For mutators, we need to set up the `currentContext` with the provided
    // `mutatorContext` and also layer on `undoTag` using `withMutatorContext`.
    return runMutator(
      () => withMutatorContext({ undoTag }, () => handler(args)),
      // This is the base context for the mutator's execution.
      mutatorContext || {},
    ) as Promise<ReturnType<T>>;
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
  initialContext: object = {}, // This is the base context for the mutator's execution
): Promise<Awaited<ReturnType<T>>> {
  currentContext = initialContext;
  return func().finally(() => {
    currentContext = null;
  }) as Promise<Awaited<ReturnType<T>>>;
}
// Type cast needed as TS looses types over nested generic returns
export const runMutator = sequential(_runMutator) as typeof _runMutator;

// `context` here refers to additional properties to layer onto `currentContext`
// for the duration of `func`. E.g., `{ undoListening: true, undoTag: 'some-tag' }`
export function withMutatorContext<T>(
  context: { undoListening?: boolean; undoTag?: unknown }, // Type of specific temporary context to merge
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
  // Merge the new context properties with the existing currentContext
  currentContext = { ...currentContext, ...context };
  return func().finally(() => {
    currentContext = prevContext;
  });
}

// Returns the currently active mutator context, which includes the application-specific
// context (e.g., 'initial' object) and any temporary context layered via `withMutatorContext`.
export function getMutatorContext(): object {
  if (currentContext == null) {
    // If no context is active and global mutations are not enabled (i.e., not in a test-like environment),
    // then it's an unexpected state, so we log it.
    if (!globalMutationsEnabled) {
      captureBreadcrumb({
        category: 'server',
        message: 'Recent methods: ' + _latestHandlerNames.join(', '),
      });
      // captureException(new Error('getMutatorContext: mutator not running'));
    }
    // For now, this is a non-fatal error. It will be in the future,
    // but this is relatively non-critical (undo just won't work) so
    // return an empty context. When we have more confidence that
    // everything is running inside a mutator, throw an error.
    return {};
  }
  return currentContext;
}
