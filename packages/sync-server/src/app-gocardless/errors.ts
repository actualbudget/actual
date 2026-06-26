import type { GoCardlessRequisitionId } from './gocardless-node.types';

export class RequisitionNotLinked extends Error {
  details: unknown;

  constructor(params: unknown = {}) {
    super('Requisition not linked yet');
    this.details = params;
  }
}

export class AccountNotLinkedToRequisition extends Error {
  details: {
    accountId: string;
    requisitionId: GoCardlessRequisitionId;
  };

  constructor(accountId: string, requisitionId: GoCardlessRequisitionId) {
    super('Provided account id is not linked to given requisition');
    this.details = { accountId, requisitionId };
  }
}

export class GenericGoCardlessError extends Error {
  details: unknown;

  constructor(data: unknown = {}) {
    super('GoCardless returned error');
    this.details = data;
  }
}

export class GoCardlessClientError extends Error {
  details: unknown;

  constructor(message: string, details: unknown) {
    super(message);
    this.details = details;
  }
}

export class InvalidInputDataError extends GoCardlessClientError {
  constructor(response: unknown) {
    super('Invalid provided parameters', response);
  }
}

export class InvalidGoCardlessTokenError extends GoCardlessClientError {
  constructor(response: unknown) {
    super('Token is invalid or expired', response);
  }
}

export class AccessDeniedError extends GoCardlessClientError {
  constructor(response: unknown) {
    super('IP address access denied', response);
  }
}

export class NotFoundError extends GoCardlessClientError {
  constructor(response: unknown) {
    super('Resource not found', response);
  }
}

export class ResourceSuspended extends GoCardlessClientError {
  constructor(response: unknown) {
    super(
      'Resource was suspended due to numerous errors that occurred while accessing it',
      response,
    );
  }
}

export class RateLimitError extends GoCardlessClientError {
  constructor(response: unknown) {
    super(
      'Daily request limit set by the Institution has been exceeded',
      response,
    );
  }
}

export class UnknownError extends GoCardlessClientError {
  constructor(response: unknown) {
    super('Request to Institution returned an error', response);
  }
}

export class ServiceError extends GoCardlessClientError {
  constructor(response: unknown) {
    super('Institution service unavailable', response);
  }
}
