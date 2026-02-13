export class RequisitionNotLinked extends Error {
  constructor(params = {}) {
    super('Requisition not linked yet');
    this.name = this.constructor.name;
    this.details = params;
  }
}

export class AccountNotLinkedToRequisition extends Error {
  constructor(accountId, requisitionId) {
    super('Provided account id is not linked to given requisition');
    this.name = this.constructor.name;
    this.details = {
      accountId,
      requisitionId,
    };
  }
}

export class GenericSophtronError extends Error {
  constructor(data = {}) {
    super('Sophtron returned error');
    this.name = this.constructor.name;
    this.details = data;
  }
}

export class SophtronClientError extends Error {
  constructor(message, details) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class InvalidInputDataError extends SophtronClientError {
  constructor(response) {
    super('Invalid provided parameters', response);
    this.name = this.constructor.name;
  }
}

export class InvalidSophtronTokenError extends SophtronClientError {
  constructor(response) {
    super('Token is invalid or expired', response);
    this.name = this.constructor.name;
  }
}

export class AccessDeniedError extends SophtronClientError {
  constructor(response) {
    super('IP address access denied', response);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends SophtronClientError {
  constructor(response) {
    super('Resource not found', response);
    this.name = this.constructor.name;
  }
}

export class ResourceSuspended extends SophtronClientError {
  constructor(response) {
    super(
      'Resource was suspended due to numerous errors that occurred while accessing it',
      response,
    );
    this.name = this.constructor.name;
  }
}

export class RateLimitError extends SophtronClientError {
  constructor(response) {
    super(
      'Daily request limit set by the Institution has been exceeded',
      response,
    );
    this.name = this.constructor.name;
  }
}

export class UnknownError extends SophtronClientError {
  constructor(response) {
    super('Request to Institution returned an error', response);
    this.name = this.constructor.name;
  }
}

export class ServiceError extends SophtronClientError {
  constructor(response) {
    super('Institution service unavailable', response);
    this.name = this.constructor.name;
  }
}
