export class FileNotFound extends Error {
  constructor(params = {}) {
    super("File does not exist or you don't have access to it");
    this.details = params;
  }
}

export class GenericFileError extends Error {
  constructor(message, params = {}) {
    super(message);
    this.details = params;
  }
}
