import { useTranslation } from 'react-i18next';
import { type Category } from '../api';

interface CategoryCardProps {
  category: Category;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CategoryCard({ category, onAdd, onRemove }: CategoryCardProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const displayName = isSpanish ? category.nameEs : category.name;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(category.amount);

  return (
    <div className="category-card" style={{ borderLeftColor: category.color }}>
      <div className="card-header">
        <span className="card-icon">{category.icon}</span>
        <span className="card-name">{displayName}</span>
      </div>
      <div className="card-amount" style={{ color: category.color }}>
        {formatted}
      </div>
      <div className="card-actions">
        <button className="btn-add" onClick={() => onAdd(category.id)}>
          + {t('actions.add')}
        </button>
        <button className="btn-remove" onClick={() => onRemove(category.id)}>
          - {t('actions.remove')}
        </button>
      </div>
    </div>
  );
}
