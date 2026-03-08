import type {
  EnableBankingAuthenticationStartResponse,
  EnableBankingErrorInterface,
  EnableBankingToken,
} from 'loot-core/types/models/enablebanking';

export type AspspSelectorProps = {
  init_country?: string;
  init_aspsp?: string;
  onComplete: (data: EnableBankingAuthenticationStartResponse) => void;
  onError: (error: EnableBankingErrorInterface) => void;
};

export type PollingComponentProps = {
  authenticationStartResponse: EnableBankingAuthenticationStartResponse;
  onComplete: (token: EnableBankingToken) => void;
  onError: (error: EnableBankingErrorInterface) => void;
};

export type CompletedAuthorizationIndicatorProps = {
  onContinue: () => Promise<void>;
};
