import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { signOut, type User } from '../firebase';

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
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
          {user.photoURL && <img src={user.photoURL} alt="" className="avatar" />}
          <span className="user-name">{user.displayName?.split(' ')[0]}</span>
        </div>
        <button onClick={signOut} className="btn-signout">
          {t('app.signOut')}
        </button>
      </div>
    </header>
  );
}
