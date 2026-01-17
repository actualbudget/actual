import { inspect } from 'util';

import createDebug from 'debug';
import { type Request, type Response } from 'express';

import { type components } from '../models/enablebanking-openapi.js';
import {
  type EnableBankingEndpoints,
  type EnableBankingErrorCode,
  type EnableBankingErrorInterface,
  type EnableBankingResponse,
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
      return new ClosedSessionError();
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
    case 'WRONG_REQUEST_PARAMETERS':
    case 'WRONG_SESSION_STATUS':
    case 'WRONG_DATE_INTERVAL':
    case 'WRONG_TRANSACTIONS_PERIOD':
    case 'WRONG_CREDENTIALS_PROVIDED':
    case 'INVALID_ACCOUNT_ID':
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
  debug('Enable Banking API error response: %o', response);
  //TODO
  const errorResponse = (await response.json()) as ErrorResponse;
  debug('Enable Banking API error response body: %o', errorResponse);

  switch (errorResponse.error) {
    case 'CLOSED_SESSION':
    case 'EXPIRED_SESSION':
      throw new ClosedSessionError();
    default:
      break;
  }

  debug('Unhandled error: %d %o', response.status, errorResponse);
  throw new Error('Not Implemented');
}

export function handleErrorInHandler<T extends keyof EnableBankingEndpoints>(
  func: (
    req: Request,
  ) => Promise<EnableBankingEndpoints[T]['response']> | never,
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
          debug(
            'Error in Enable Banking %s: %s',
            req.originalUrl,
            inspect(err, { depth: null }),
          );
          err = new EnableBankingError(
            'INTERNAL_ERROR',
            err.message ??
              'Something went wrong while using the Enable Banking API.',
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
