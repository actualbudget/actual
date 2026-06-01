export class FileNotFound extends Error {
  details: any;
  constructor(params = {}) {
    super("File does not exist or you don't have access to it");
    this.details = params;
  }
}

export class GenericFileError extends Error {
  details: any;
  constructor(message: string, params = {}) {
    super(message);
    this.details = params;
  }
}
