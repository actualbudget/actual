const USERS_KEY = 'stash-users';
const CURRENT_USER_KEY = 'stash-current-user';
const APP_PIN_KEY = 'stash-app-pin';
const DEFAULT_PIN = '1234';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

function initializePin() {
  if (!localStorage.getItem(APP_PIN_KEY)) {
    localStorage.setItem(APP_PIN_KEY, DEFAULT_PIN);
  }
}

export function verifyPin(pin: string): boolean {
  initializePin();
  return pin === localStorage.getItem(APP_PIN_KEY);
}

export function getOrCreateUser(name: string): User {
  initializePin();
  let users: User[] = [];
  try {
    const saved = localStorage.getItem(USERS_KEY);
    users = saved ? JSON.parse(saved) : [];
  } catch {
    users = [];
  }

  let user = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name,
    };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export function getCurrentUser(): User | null {
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getAllUsers(): User[] {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
