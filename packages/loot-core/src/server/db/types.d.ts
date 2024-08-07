type TemplateNote = {
  category_id: string;
  note: string;
};

type Category = {
  id: string;
  name: string;
  is_income: number;
  cat_group: string;
  sort_order: number;
  tombstone: number;
  hidden: boolean;
  goal_def?: string | null;
};

type VCategory = {
  id: string;
  name: string;
  is_income: number;
  hidden: boolean;
  group: string;
  sort_order: number;
  tombstone: number;
};

type Schedule = {
  id: string;
  rule: string;
  active: number;
  completed: number;
  posts_transaction: number;
  tombstone: number;
  name: string | null;
};
