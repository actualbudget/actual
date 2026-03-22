import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Category } from '../api';

interface TransactionModalProps {
  category: Category;
  type: 'deposit' | 'withdrawal';
  onConfirm: (amount: number, note: string) => void;
  onCancel: () => void;
}

export function TransactionModal({ category, type, onConfirm, onCancel }: TransactionModalProps) {
  const { t, i18n } = useTranslation();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const isSpanish = i18n.language === 'es';
  const displayName = isSpanish ? category.nameEs : category.name;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (num > 0) {
      onConfirm(num, note);
    }
  };

  const isDeposit = type === 'deposit';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {isDeposit ? t('actions.add') : t('actions.remove')}
          <span className="modal-category"> — {displayName} {category.icon}</span>
        </h2>

        <div className="modal-current">
          {t('app.total')}: ${category.amount.toLocaleString()}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('actions.amount')}</label>
            <div className="amount-input-wrapper">
              <span className="dollar-sign">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="amount-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('actions.note')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isDeposit ? 'Paycheck, transfer...' : 'Rent, groceries...'}
              className="note-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              className={`btn-confirm ${isDeposit ? 'btn-deposit' : 'btn-withdrawal'}`}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              {t('actions.confirm')} {isDeposit ? t('actions.deposit') : t('actions.withdrawal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
