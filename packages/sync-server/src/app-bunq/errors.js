export class BunqNotImplementedYetError extends Error {
  constructor(operation) {
    super(`Not implemented yet: ${operation}`);
    this.name = 'BunqNotImplementedYetError';
    this.operation = operation;
    this.error_type = 'NOT_IMPLEMENTED_YET';
    this.error_code = 'NOT_IMPLEMENTED_YET';
  }
}

export class BunqAuthError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'BunqAuthError';
    this.error_type = 'AUTH_ERROR';
    this.error_code = 'AUTH_ERROR';
    this.details = details;
  }
}

export class BunqRateLimitError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'BunqRateLimitError';
    this.error_type = 'RATE_LIMIT_ERROR';
    this.error_code = 'RATE_LIMIT_ERROR';
    this.details = details;
  }
}

export class BunqSignatureError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'BunqSignatureError';
    this.error_type = 'SIGNATURE_ERROR';
    this.error_code = 'SIGNATURE_ERROR';
    this.details = details;
  }
}

export class BunqInvalidResponseError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'BunqInvalidResponseError';
    this.error_type = 'INVALID_RESPONSE';
    this.error_code = 'INVALID_RESPONSE';
    this.details = details;
  }
}

export class BunqConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BunqConfigurationError';
    this.error_type = 'CONFIGURATION_ERROR';
    this.error_code = 'CONFIGURATION_ERROR';
  }
}

export class BunqProtocolError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'BunqProtocolError';
    this.error_type = 'BUNQ_PROTOCOL_ERROR';
    this.error_code = 'BUNQ_PROTOCOL_ERROR';
    this.details = details;
  }
}
