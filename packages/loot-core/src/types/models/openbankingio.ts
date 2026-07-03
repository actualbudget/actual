// Normalized type for client-side account selection (matches SimpleFIN/PluggyAI pattern)
export type SyncServerOpenBankingIoAccount = {
  account_id: string;
  name: string;
  institution: string;
  balance: number;
};
