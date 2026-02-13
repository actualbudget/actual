import { inspect } from 'util';

import createDebug from 'debug';
import type { Request, Response } from 'express';

import type { components } from '../models/enablebanking-openapi.js';
import type {
  EnableBankingEndpoints,
  EnableBankingErrorCode,
  EnableBankingErrorInterface,
  EnableBankingResponse,
} from '../models/enablebanking.js';

const debug = createDebug('actual:enablebanking:errors');

export type ErrorResponse = components['schemas']['ErrorResponse'];

export class EnableBankingError extends Error {
  error_code: EnableBankingErrorCode;
  constructor(
    error_code: EnableBankingErrorCode = 'INTERNAL_ERROR',
    message?: string,
  ) {
    super(message);
    this.error_code = error_code;
  }
  data(): EnableBankingErrorInterface {
    return {
      error_code: this.error_code,
      error_type: this.message ?? '',
    };
  }
}

function makeErrorClass(error_code: EnableBankingErrorCode) {
  return class SpecificEnableBankingError extends EnableBankingError {
    constructor(message?: string) {
      super(error_code, message);
    }
  };
}

export class EnableBankingSetupError extends EnableBankingError {
  constructor(message?: string) {
    super(
      'ENABLEBANKING_NOT_CONFIGURED',
      message ?? 'The Enable Banking secrets are not setup yet.',
    );
  }
}

export const ClosedSessionError = makeErrorClass(
  'ENABLEBANKING_SESSION_CLOSED',
);
export const BadRequestError = makeErrorClass('BAD_REQUEST');
export const NotReadyError = makeErrorClass('NOT_READY');
export const ResourceNotFoundError = makeErrorClass('NOT_FOUND');
export const SecretsInvalidError = makeErrorClass(
  'ENABLEBANKING_SECRETS_INVALID',
);
export const ApplicationInactiveError = makeErrorClass(
  'ENABLEBANKING_APPLICATION_INACTIVE',
);

export function badRequestVariableError(name: string, endpoint: string) {
  return new BadRequestError(
    `Variable '${name}' not defined and is necessary for '${endpoint}'.`,
  );
}

export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ErrorResponse).error === 'string'
  );
}

export function handleErrorResponse(
  response: ErrorResponse,
): EnableBankingError {
  switch (response.error) {
    case 'CLOSED_SESSION':
    case 'EXPIRED_SESSION':
    case 'REVOKED_SESSION':
      // These errors indicate that the session is no longer valid.
      // The client should re-authenticate.
      return new ClosedSessionError(
        'Your bank connection has expired. Please re-link your bank account.',
      );
    case 'SESSION_DOES_NOT_EXIST':
    case 'TRANSACTION_DOES_NOT_EXIST':
    case 'PAYMENT_NOT_FOUND':
      // These errors indicate that the requested resource does not exist.
      return new ResourceNotFoundError(
        `The requested resource does not exist: ${response.message}`,
      );
    case 'UNAUTHORIZED_ACCESS':
    case 'ACCESS_DENIED':
      // These errors indicate that the client does not have permission to access the resource.
      return new SecretsInvalidError();
    case 'INVALID_ACCOUNT_ID':
      // Account no longer valid - user needs to re-link
      console.warn(
        `Enable Banking API returned INVALID_ACCOUNT_ID: ${response.message}`,
      );
      return new EnableBankingError(
        'ENABLEBANKING_SESSION_CLOSED',
        'The linked bank account is no longer valid. Please re-link your bank account.',
      );
    case 'ASPSP_ERROR':
    case 'ASPSP_TIMEOUT':
    case 'ASPSP_RATE_LIMIT_EXCEEDED':
    case 'ASPSP_ACCOUNT_NOT_ACCESSIBLE':
    case 'ASPSP_PSU_ACTION_REQUIRED':
      // Bank-side errors - temporary issues or user action required
      console.warn(
        `Enable Banking API returned bank-side error: ${response.error} - ${response.message}`,
      );
      return new EnableBankingError(
        'INTERNAL_ERROR',
        `The bank encountered an issue: ${response.message}. This is usually temporary - please try syncing again later.`,
      );
    case 'WRONG_REQUEST_PARAMETERS':
    case 'WRONG_SESSION_STATUS':
    case 'WRONG_DATE_INTERVAL':
    case 'WRONG_CREDENTIALS_PROVIDED':
    case 'INVALID_HOST':
    case 'INVALID_PAYMENT':
    case 'REDIRECT_URI_NOT_ALLOWED':
    case 'WEBHOOK_URI_NOT_ALLOWED':
    case 'UNTRUSTED_PAYMENT_PARTY':
      console.warn(
        `Enable Banking API returned an error about request formatting: ${response.error} - ${response.message}`,
      );
      return new EnableBankingError(
        'INTERNAL_ERROR',
        'Something went wrong while using the Enable Banking API. Please try again later.',
      );
    case 'WRONG_TRANSACTIONS_PERIOD':
      console.warn(
        `Enable Banking API returned WRONG_TRANSACTIONS_PERIOD: ${response.message}`,
      );
      return new EnableBankingError(
        'INTERNAL_ERROR',
        'The requested transaction date range is not valid. The bank may have limitations on how far back transactions can be retrieved. Try adjusting your sync start date.',
      );
    default:
      // For all other errors, we throw a generic EnableBankingError.
      console.error(
        `Enable Banking API returned an error: ${response.error} - ${response.message}`,
      );
      return new EnableBankingError(
        'INTERNAL_ERROR',
        'Something went wrong while using the Enable Banking API. Please try again later.',
      );
  }
}

export async function handleEnableBankingError(response: globalThis.Response) {
  if (response.status === 200) {
    return await response.json();
  }
  console.error(
    `Enable Banking API error response: HTTP ${response.status} ${response.statusText}`,
  );

  // Read response text first, then parse as JSON (body stream is single-use)
  let rawText: string;
  try {
    rawText = await response.text();
  } catch {
    rawText = '(unable to read response body)';
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    // Non-JSON response (e.g., HTML 502 from a proxy) - preserve HTTP context
    console.error('Enable Banking API returned non-JSON response:', rawText);
    throw new EnableBankingError(
      'INTERNAL_ERROR',
      `Enable Banking API returned HTTP ${response.status} with non-JSON body.`,
    );
  }

  if (!isErrorResponse(body)) {
    console.error('Unexpected error response format:', body);
    throw new EnableBankingError(
      'INTERNAL_ERROR',
      'Unexpected error response from Enable Banking API.',
    );
  }

  const errorResponse = body;
  debug('Enable Banking API error response body: %o', errorResponse);

  throw handleErrorResponse(errorResponse);
}

export function handleErrorInHandler<T extends keyof EnableBankingEndpoints>(
  func: (req: Request) => Promise<EnableBankingEndpoints[T]['response']>,
) {
  return (
    req: Request,
    res: Response<{ status: 'ok'; data: EnableBankingResponse<T> }>,
  ) => {
    // Makes sure we respond with a valid JSON Response
    func(req)
      .then(data => {
        res.send({
          status: 'ok',
          data: { data },
        });
      })
      .catch(err => {
        if (!(err instanceof EnableBankingError)) {
          console.error(
            'Error in Enable Banking endpoint:',
            'URL:',
            req.originalUrl,
            'Error:',
            inspect(err, { depth: null }),
          );
          const safeMessage =
            typeof err === 'object' && err !== null && 'message' in err
              ? (err as Error).message
              : String(err);
          err = new EnableBankingError(
            'INTERNAL_ERROR',
            safeMessage ??
              'Something went wrong while using the Enable Banking API.',
          );
        } else if (
          err.error_code !== 'NOT_READY' &&
          err.error_code !== 'BAD_REQUEST'
        ) {
          // Log non-trivial errors for debugging
          console.warn(
            'Enable Banking error:',
            'URL:',
            req.originalUrl,
            'Error:',
            `[${err.error_code}] ${err.message}`,
          );
        }
        debug('Returning error: %o', err.data());
        res.send({
          status: 'ok',
          data: { error: err.data() },
        });
      });
  };
}
