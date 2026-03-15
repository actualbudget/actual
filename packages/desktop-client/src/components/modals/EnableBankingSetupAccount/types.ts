import type {
  EnableBankingAuthenticationStartResponse,
  EnableBankingErrorInterface,
  EnableBankingToken,
} from 'loot-core/types/models/enablebanking';

export type AspspSelectorProps = {
  initialCountry?: string;
  initialAspsp?: string;
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
