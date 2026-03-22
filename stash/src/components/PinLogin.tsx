import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { api, type User } from '../api';

interface PinLoginProps {
  onLogin: (user: User) => void;
}

export function PinLogin({ onLogin }: PinLoginProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'pin' | 'name'>('pin');
  const [verifiedPin, setVerifiedPin] = useState('');

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.verifyPin(pin);
      setVerifiedPin(pin);
      setError('');
      setStep('name');
    } catch {
      setError(t('app.incorrectPin') || 'Incorrect PIN');
      setPin('');
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { user } = await api.login(verifiedPin, name.trim());
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">Stash</h1>
          <p className="login-subtitle">{t('app.subtitle')}</p>
        </div>

        {step === 'pin' ? (
          <form onSubmit={handlePinSubmit}>
            <div className="form-group">
              <label>{t('app.enterPin')}</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 6))}
                placeholder="••••"
                autoFocus
                maxLength={6}
                className="pin-input"
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="btn-confirm btn-deposit" style={{ width: '100%', marginTop: '16px' }} disabled={!pin}>
              {t('app.enter')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit}>
            <div className="form-group">
              <label>{t('app.yourName')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('app.namePlaceholder')}
                autoFocus
                className="note-input"
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="btn-confirm btn-deposit" style={{ width: '100%', marginTop: '16px' }} disabled={!name.trim()}>
              {t('app.continue')}
            </button>
          </form>
        )}

        <div className="login-lang">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
