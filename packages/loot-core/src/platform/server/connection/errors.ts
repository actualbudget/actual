export type TransferableError = {
  type: string;
  message?: string;
  // Stable, machine-readable failure code (e.g. 'network-failure',
  // 'invalid-password', 'budget-not-found'). Sourced from the error's
  // `reason`/`code` and guaranteed to survive the boundary.
  code?: string;
  name?: string;
  stack?: string;
  cause?: unknown;
};

function getField(error: unknown, field: string): unknown {
  return typeof error === 'object' && error !== null
    ? (error as Record<string, unknown>)[field]
    : undefined;
}

function getStringField(error: unknown, field: string): string | undefined {
  const value = getField(error, field);
  return typeof value === 'string' ? value : undefined;
}

// Internal errors carry their machine-readable slug on `reason` (PostError,
// SyncError, …) or `code` (BankSyncError, Node system errors); `errno` covers
// Emscripten filesystem errors.
function getErrorCode(error: unknown): string | undefined {
  const code =
    getField(error, 'reason') ??
    getField(error, 'code') ??
    getField(error, 'errno');

  if (typeof code === 'string') {
    return code;
  }
  if (typeof code === 'number') {
    return String(code);
  }
  return undefined;
}

function coerceError(error: unknown): TransferableError {
  if (getField(error, 'type') === 'APIError') {
    return error as TransferableError;
  }

  return {
    type: 'ServerError',
    message: getStringField(error, 'message'),
    code: getErrorCode(error),
    name: getStringField(error, 'name'),
    cause: error,
  };
}

// A reduced shape that is always structured-cloneable: `cause` (the original
// error) is dropped, everything kept is a plain string.
function toCloneableError(error: TransferableError): TransferableError {
  return {
    type: error.type,
    message: error.message,
    code: error.code,
    name: error.name,
    stack: getStringField(error.cause, 'stack'),
  };
}

// Post a rejected handler result in the envelope the request expects, and
// return the serialized error for the caller's reporting. If the structured
// clone inside `post` fails — the error held a non-cloneable value, e.g. an
// Emscripten ErrnoError carrying methods — retry with a plain, always
// cloneable shape so the real failure isn't replaced by a DataCloneError.
export function postErrorReply(
  post: (message: unknown) => void,
  request: { id: unknown; name: string; catchErrors?: boolean },
  rejection: unknown,
): TransferableError {
  const { id, name, catchErrors } = request;
  const error = coerceError(rejection);

  function buildMessage(err: TransferableError) {
    if (name.startsWith('api/')) {
      // The API is newer and does automatically forward errors
      return { type: 'reply', id, error: err };
    }
    if (catchErrors) {
      return { type: 'reply', id, result: { error: err, data: null } };
    }
    return { type: 'error', id, error: err };
  }

  try {
    post(buildMessage(error));
  } catch {
    post(buildMessage(toCloneableError(error)));
  }

  return error;
}
