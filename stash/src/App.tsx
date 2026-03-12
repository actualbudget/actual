import { useState, useEffect } from 'react';
import { getCurrentUser, type User } from './auth';
import { PinLogin } from './components/PinLogin';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    // Keep user in sync if they log in from another tab
    const handleStorageChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <PinLogin onLogin={() => setUser(getCurrentUser())} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
