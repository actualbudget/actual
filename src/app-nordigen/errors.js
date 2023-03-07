export class RequisitionNotLinked extends Error {
  constructor(params = {}) {
    super('Requisition not linked yet');
    this.details = params;
  }
}

export class AccountNotLinedToRequisition extends Error {
  constructor(accountId, requisitionId) {
    super('Provided account id is not linked to given requisition');
    this.details = {
      accountId,
      requisitionId,
    };
  }
}

export class GenericNordigenError extends Error {
  constructor(data = {}) {
    super('Nordigen returned error');
    this.details = data;
  }
}

export class NordigenClientError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

export class InvalidInputDataError extends NordigenClientError {
  constructor(response) {
    super('Invalid provided parameters', response);
  }
}

export class InvalidNordigenTokenError extends NordigenClientError {
  constructor(response) {
    super('Token is invalid or expired', response);
  }
}

export class AccessDeniedError extends NordigenClientError {
  constructor(response) {
    super('IP address access denied', response);
  }
}

export class NotFoundError extends NordigenClientError {
  constructor(response) {
    super('Resource not found', response);
  }
}

export class ResourceSuspended extends NordigenClientError {
  constructor(response) {
    super(
      'Resource was suspended due to numerous errors that occurred while accessing it',
      response,
    );
  }
}

export class RateLimitError extends NordigenClientError {
  constructor(response) {
    super(
      'Daily request limit set by the Institution has been exceeded',
      response,
    );
  }
}

export class UnknownError extends NordigenClientError {
  constructor(response) {
    super('Request to Institution returned an error', response);
  }
}

export class ServiceError extends NordigenClientError {
  constructor(response) {
    super('Institution service unavailable', response);
  }
}
