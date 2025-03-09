import { AccountEntity } from './account';

export interface HoldingEntity {
  id: string;
  account: AccountEntity['id'];
  symbol: string;
  title?: string;
  shares: number;
  market_value: number;
  purchase_price: number;
  raw_synced_data?: string | undefined;
}
