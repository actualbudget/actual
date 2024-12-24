export class RequisitionNotLinked extends Error {
  constructor(params = {}) {
    super('Requisition not linked yet');
    this.details = params;
  }
}

export class AccountNotLinkedToRequisition extends Error {
  constructor(accountId, requisitionId) {
    super('Provided account id is not linked to given requisition');
    this.details = {
      accountId,
      requisitionId,
    };
  }
}

export class GenericGoCardlessError extends Error {
  constructor(data = {}) {
    super('GoCardless returned error');
    this.details = data;
  }
}

export class GoCardlessClientError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

export class InvalidInputDataError extends GoCardlessClientError {
  constructor(response) {
    super('Invalid provided parameters', response);
  }
}

export class InvalidGoCardlessTokenError extends GoCardlessClientError {
  constructor(response) {
    super('Token is invalid or expired', response);
  }
}

export class AccessDeniedError extends GoCardlessClientError {
  constructor(response) {
    super('IP address access denied', response);
  }
}

export class NotFoundError extends GoCardlessClientError {
  constructor(response) {
    super('Resource not found', response);
  }
}

export class ResourceSuspended extends GoCardlessClientError {
  constructor(response) {
    super(
      'Resource was suspended due to numerous errors that occurred while accessing it',
      response,
    );
  }
}

export class RateLimitError extends GoCardlessClientError {
  constructor(response) {
    super(
      'Daily request limit set by the Institution has been exceeded',
      response,
    );
  }
}

export class UnknownError extends GoCardlessClientError {
  constructor(response) {
    super('Request to Institution returned an error', response);
  }
}

export class ServiceError extends GoCardlessClientError {
  constructor(response) {
    super('Institution service unavailable', response);
  }
}
