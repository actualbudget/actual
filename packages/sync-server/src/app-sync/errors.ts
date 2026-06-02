export class FileNotFound extends Error {
  details: Record<string, unknown>;
  constructor(params = {}) {
    super("File does not exist or you don't have access to it");
    this.details = params;
  }
}

export class GenericFileError extends Error {
  details: Record<string, unknown>;
  constructor(message: string, params = {}) {
    super(message);
    this.details = params;
  }
}
