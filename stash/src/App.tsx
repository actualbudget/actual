import { useState, useEffect } from 'react';
import { onAuthChange, type User } from './firebase';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <h1 className="login-logo">Stash</h1>
        <div className="spinner" />
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <Login />;
}
