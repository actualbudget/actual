import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStash } from '../hooks/useStash';
import { type User } from '../auth';
import { Header } from './Header';
import { CategoryCard } from './CategoryCard';
import { TransactionModal } from './TransactionModal';
import { TransactionHistory } from './TransactionHistory';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const { t } = useTranslation();
  const { categories, transactions, total, addTransaction } = useStash();
  const [modal, setModal] = useState<{
    categoryId: string;
    type: 'deposit' | 'withdrawal';
  } | null>(null);

  const activeCategory = modal ? categories.find((c) => c.id === modal.categoryId) : null;

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(total);

  return (
    <div className="dashboard">
      <Header user={user} onLogout={onLogout} />

      <main className="main">
        <div className="total-section">
          <span className="total-label">{t('app.total')}</span>
          <span className="total-amount">{formattedTotal}</span>
        </div>

        <div className="categories-grid">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onAdd={(id) => setModal({ categoryId: id, type: 'deposit' })}
              onRemove={(id) => setModal({ categoryId: id, type: 'withdrawal' })}
            />
          ))}
        </div>

        <TransactionHistory transactions={transactions} categories={categories} />
      </main>

      {modal && activeCategory && (
        <TransactionModal
          category={activeCategory}
          type={modal.type}
          onConfirm={(amount, note) => {
            addTransaction(modal.categoryId, amount, modal.type, note);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
