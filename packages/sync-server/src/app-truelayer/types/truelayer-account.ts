import type { TrueLayerProvider } from './truelayer-provider';

export type TrueLayerAccount = {
  account_id: string;
  account_type?: string;
  display_name?: string;
  currency?: string;
  provider?: TrueLayerProvider;
};
