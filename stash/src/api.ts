export interface User {
  id: string;
  name: string;
}

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
  userId: string;
  userName: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  note: string;
  date: string;
}

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  verifyPin: (pin: string) =>
    request('/api/auth/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),

  login: (pin: string, name: string): Promise<{ user: User }> =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin, name }) }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  me: (): Promise<{ user: User }> =>
    request('/api/auth/me'),

  getCategories: (): Promise<Category[]> =>
    request('/api/categories'),

  getTransactions: (): Promise<Transaction[]> =>
    request('/api/transactions'),

  addTransaction: (categoryId: string, amount: number, type: 'deposit' | 'withdrawal', note: string): Promise<{ transaction: Transaction; newAmount: number }> =>
    request('/api/transactions', { method: 'POST', body: JSON.stringify({ categoryId, amount, type, note }) }),

  changePin: (currentPin: string, newPin: string) =>
    request('/api/auth/change-pin', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) }),
};
