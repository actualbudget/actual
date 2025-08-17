export type EnableBankingErrorResponse = {
  message: string;
  code: number;
  detail: string;
};

export class EnableBankingSetupError extends Error {
  constructor() {
    super('The Enable Banking secrets are not setup yet.');
  }
}

export async function handleEnableBankingError(response: Response) {
  if (response.status === 200) {
    return await response.json();
  }
  //TODO
  console.log(response.status, await response.text());
  throw new Error('Not Implemented');
}
