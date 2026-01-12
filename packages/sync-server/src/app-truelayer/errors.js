export class InvalidTrueLayerTokenError extends Error {
  constructor() {
    super('Invalid TrueLayer access token');
    this.name = 'InvalidTrueLayerTokenError';
  }
}

export class AuthorizationNotLinkedError extends Error {
  constructor() {
    super('Authorization not completed yet');
    this.name = 'AuthorizationNotLinkedError';
  }
}

export class AccessDeniedError extends Error {
  constructor(detail) {
    super(detail || 'Access denied');
    this.name = 'AccessDeniedError';
  }
}

export class NotFoundError extends Error {
  constructor(detail) {
    super(detail || 'Resource not found');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export class ServiceError extends Error {
  constructor(detail) {
    super(detail || 'TrueLayer service error');
    this.name = 'ServiceError';
  }
}
