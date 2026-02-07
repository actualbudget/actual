import { useState, useEffect, useCallback } from 'react';
import { Category, Transaction, DEFAULT_CATEGORIES, StashData } from '../types';

const STORAGE_KEY = 'stash-data';

function loadData(): StashData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore parse errors
  }
  return {
    categories: DEFAULT_CATEGORIES,
    transactions: [],
  };
}

function saveData(data: StashData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStash() {
  const [categories, setCategories] = useState<Category[]>(() => loadData().categories);
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadData().transactions);

  useEffect(() => {
    saveData({ categories, transactions });
  }, [categories, transactions]);

  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);

  const addTransaction = useCallback(
    (categoryId: string, amount: number, type: 'deposit' | 'withdrawal', note: string) => {
      const tx: Transaction = {
        id: crypto.randomUUID(),
        categoryId,
        amount,
        type,
        note,
        date: new Date().toISOString(),
      };

      setTransactions((prev) => [tx, ...prev]);

      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id === categoryId) {
            const newAmount = type === 'deposit' ? cat.amount + amount : cat.amount - amount;
            return { ...cat, amount: Math.max(0, newAmount) };
          }
          return cat;
        }),
      );
    },
    [],
  );

  return { categories, transactions, total, addTransaction };
}
