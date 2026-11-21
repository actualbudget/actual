import type { TrueLayerProvider } from './truelayer-provider';

export type TrueLayerCard = {
  account_id: string;
  card_type?: string;
  display_name?: string;
  partial_card_number?: string;
  currency?: string;
  provider?: TrueLayerProvider;
};
