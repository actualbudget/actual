export interface Category {
  id: string;
  name: string;
  nameEs: string;
  amount: number;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  categoryId: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  note: string;
  date: string;
}

export interface StashData {
  categories: Category[];
  transactions: Transaction[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'saving', name: 'Saving', nameEs: 'Ahorro', amount: 2200, icon: '💰', color: '#10B981' },
  { id: 'giving', name: 'Giving', nameEs: 'Diezmo', amount: 1400, icon: '🤲', color: '#8B5CF6' },
  { id: 'travel', name: 'Travel', nameEs: 'Viajes', amount: 0, icon: '✈️', color: '#3B82F6' },
  { id: 'kupuri', name: 'Kupuri', nameEs: 'Kupuri', amount: 2000, icon: '🌟', color: '#F59E0B' },
  { id: 'bills', name: 'Bills', nameEs: 'Cuentas', amount: 800, icon: '📄', color: '#EF4444' },
  { id: 'emergency', name: 'Emergency', nameEs: 'Emergencia', amount: 2000, icon: '🚨', color: '#F97316' },
  { id: 'pleasure', name: 'Pleasure', nameEs: 'Placer', amount: 500, icon: '🎉', color: '#EC4899' },
  { id: 'medical', name: 'Medical', nameEs: 'Médico', amount: 0, icon: '🏥', color: '#06B6D4' },
];
