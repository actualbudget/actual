export type Schedule = {
  id: string;
  rule: string;
  active: number;
  completed: number;
  posts_transaction: number;
  tombstone: number;
  name: string | null;
};
