export type SavingsPlanEntity = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  months: number;
  start_month: string | null;
  status: 'active' | 'completed';
};
