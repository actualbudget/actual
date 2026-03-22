import { useState, useEffect, useCallback } from 'react';
import { api, type Category, type Transaction } from '../api';

export function useStash() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [cats, txs] = await Promise.all([api.getCategories(), api.getTransactions()]);
      setCategories(cats);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);

  const addTransaction = useCallback(
    async (categoryId: string, amount: number, type: 'deposit' | 'withdrawal', note: string) => {
      const { transaction, newAmount } = await api.addTransaction(categoryId, amount, type, note);

      setCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? { ...cat, amount: newAmount } : cat)),
      );
      setTransactions((prev) => [transaction, ...prev].slice(0, 50));
    },
    [],
  );

  return { categories, transactions, total, addTransaction, loading, refresh };
}
