import { useState, useEffect } from 'react';
import { api, type User } from './api';
import { PinLogin } from './components/PinLogin';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <h1 className="login-logo">Stash</h1>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <PinLogin onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
