import type { PayPalPayerName } from './paypal-payer-name';

export type PayPalPayerInfo = {
  email_address?: string;
  payer_name?: PayPalPayerName;
};
