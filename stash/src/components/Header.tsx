import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { type User } from '../api';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">Stash</h1>
        <span className="header-subtitle">{t('app.subtitle')}</span>
      </div>
      <div className="header-right">
        <LanguageToggle />
        <div className="user-info">
          <span className="user-avatar">👤</span>
          <span className="user-name">{user.name}</span>
        </div>
        <button onClick={onLogout} className="btn-signout">
          {t('app.signOut')}
        </button>
      </div>
    </header>
  );
}
