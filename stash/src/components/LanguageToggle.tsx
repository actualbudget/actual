import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  const toggle = () => {
    const newLang = isSpanish ? 'en' : 'es';
    i18n.changeLanguage(newLang);
    localStorage.setItem('stash-language', newLang);
  };

  return (
    <button onClick={toggle} className="lang-toggle" aria-label="Toggle language">
      <span className={`lang-option ${!isSpanish ? 'active' : ''}`}>EN</span>
      <span className="lang-divider">/</span>
      <span className={`lang-option ${isSpanish ? 'active' : ''}`}>ES</span>
    </button>
  );
}
