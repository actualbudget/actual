import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { verifyPin, getOrCreateUser } from '../auth';

interface PinLoginProps {
  onLogin: () => void;
}

export function PinLogin({ onLogin }: PinLoginProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'pin' | 'name'>('pin');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPin(pin)) {
      setError('');
      setStep('name');
      setPin('');
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      getOrCreateUser(name.trim());
      onLogin();
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
              <label>Enter PIN</label>
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
            <button type="submit" className="btn-confirm btn-deposit" disabled={!pin}>
              Enter
            </button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit}>
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Partner 1"
                autoFocus
                className="note-input"
              />
            </div>
            <button type="submit" className="btn-confirm btn-deposit" disabled={!name.trim()}>
              Continue
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
