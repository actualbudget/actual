import { useTranslation } from 'react-i18next';
import { type Transaction, type Category } from '../api';

interface TransactionHistoryProps {
  transactions: Transaction[];
  categories: Category[];
}

export function TransactionHistory({ transactions, categories }: TransactionHistoryProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const recent = transactions.slice(0, 15);

  const getCategoryName = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return id;
    return isSpanish ? cat.nameEs : cat.name;
  };

  const getCategoryIcon = (id: string) => {
    return categories.find((c) => c.id === id)?.icon || '';
  };

  if (recent.length === 0) {
    return (
      <div className="history">
        <h2 className="history-title">{t('history.title')}</h2>
        <p className="history-empty">{t('history.noTransactions')}</p>
      </div>
    );
  }

  return (
    <div className="history">
      <h2 className="history-title">{t('history.title')}</h2>
      <div className="history-list">
        {recent.map((tx) => {
          const isDeposit = tx.type === 'deposit';
          const date = new Date(tx.date);
          const formatted = date.toLocaleString(isSpanish ? 'es-MX' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={tx.id} className="history-item">
              <span className="history-icon">{getCategoryIcon(tx.categoryId)}</span>
              <div className="history-details">
                <span className="history-label">
                  <strong>{tx.userName}</strong>{' '}
                  {isDeposit ? t('history.deposited') : t('history.withdrew')}{' '}
                  {isDeposit ? t('history.to') : t('history.from')}{' '}
                  <strong>{getCategoryName(tx.categoryId)}</strong>
                </span>
                {tx.note && <span className="history-note">{tx.note}</span>}
                <span className="history-date">{formatted}</span>
              </div>
              <span className={`history-amount ${isDeposit ? 'positive' : 'negative'}`}>
                {isDeposit ? '+' : '-'}${tx.amount.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
