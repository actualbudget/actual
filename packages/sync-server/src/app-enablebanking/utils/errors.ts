import { inspect } from 'util';

import { Request, Response } from 'express';

import { ErrorResponse } from '../models/models-enablebanking.js';

export type ErrorCode =
  | 'INTERNAL_ERROR'
  | 'ENABLEBANKING_SESSION_CLOSED'
  | 'BAD_REQUEST'
  | 'NOT_READY'
  | 'NOT_FOUND';

export type EnableBankingErrorInterface = {
  error_code: ErrorCode;
  error_type: string;
};

export class EnableBankingError extends Error {
  error_code: ErrorCode;
  constructor(error_code: ErrorCode = 'INTERNAL_ERROR', message?: string) {
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

function makeErrorClass(error_code: ErrorCode) {
  return class SpecificEnableBankingError extends EnableBankingError {
    constructor(message?: string) {
      super(error_code, message);
    }
  };
}

export class EnableBankingSetupError extends Error {
  constructor() {
    super('The Enable Banking secrets are not setup yet.');
  }
}

export const ClosedSessionError = makeErrorClass(
  'ENABLEBANKING_SESSION_CLOSED',
);
export const BadRequestError = makeErrorClass('BAD_REQUEST');
export const NotReadyError = makeErrorClass('NOT_READY');
export const ResourceNotFoundError = makeErrorClass("NOT_FOUND");

export function badRequestVariableError(name: string, endpoint: string) {
  return new BadRequestError(
    `Variable '${name}' not defined and is necessary for '${endpoint}'.`,
  );
}

export async function handleEnableBankingError(response: globalThis.Response) {
  if (response.status === 200) {
    return await response.json();
  }
  console.log(response);
  //TODO
  const errorResponse = (await response.json()) as ErrorResponse;
  console.log(errorResponse);

  switch (errorResponse.error) {
    case 'CLOSED_SESSION':
    case 'EXPIRED_SESSION':
      throw new ClosedSessionError();
  }

  console.log(response.status, errorResponse);
  throw new Error('Not Implemented');
}

export function handleErrorInHandler<T>(
  func: (req: Request) => Promise<T> | never,
) {
  return (req: Request, res: Response) => {
    func(req)
      .then(data => {
        res.send({
          status: 'ok',
          data,
        });
      })
      .catch(err => {
        if (!(err instanceof EnableBankingError)) {
          console.log(
            'Error in Enable Banking',
            req.originalUrl,
            inspect(err, { depth: null }),
          );
          err = new EnableBankingError(
            'INTERNAL_ERROR',
            err.message ??
              'Something went wrong while using the Enable Banking API.',
          );
        }
        res.send({
          status: 'ok',
          data: err.data(),
        });
      });
  };
}
