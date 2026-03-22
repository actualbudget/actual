import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, hashPin } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(cookieParser());

// ── Auth middleware ──────────────────────────────────────────────────
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.stash_token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = db.prepare(
    "SELECT s.user_id, u.name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
  ).get(token) as { user_id: string; name: string } | undefined;

  if (!session) {
    res.clearCookie('stash_token');
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  (req as any).userId = session.user_id;
  (req as any).userName = session.name;
  next();
}

// ── Auth routes ─────────────────────────────────────────────────────
app.post('/api/auth/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string') {
    res.status(400).json({ error: 'PIN required' });
    return;
  }

  const stored = db.prepare("SELECT value FROM app_config WHERE key = 'pin_hash'").get() as { value: string } | undefined;
  if (!stored || hashPin(pin) !== stored.value) {
    res.status(401).json({ error: 'Incorrect PIN' });
    return;
  }

  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { pin, name } = req.body;
  if (!pin || !name || typeof pin !== 'string' || typeof name !== 'string') {
    res.status(400).json({ error: 'PIN and name required' });
    return;
  }

  const stored = db.prepare("SELECT value FROM app_config WHERE key = 'pin_hash'").get() as { value: string } | undefined;
  if (!stored || hashPin(pin) !== stored.value) {
    res.status(401).json({ error: 'Incorrect PIN' });
    return;
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    res.status(400).json({ error: 'Name required' });
    return;
  }

  // Find or create user
  let user = db.prepare('SELECT id, name FROM users WHERE LOWER(name) = LOWER(?)').get(trimmedName) as { id: string; name: string } | undefined;
  if (!user) {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(id, trimmedName);
    user = { id, name: trimmedName };
  }

  // Create session (30 days)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);

  // Clean up expired sessions
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

  res.cookie('stash_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({ user: { id: user.id, name: user.name } });
});

app.post('/api/auth/logout', (_req, res) => {
  const token = _req.cookies?.stash_token;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('stash_token');
  res.json({ ok: true });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: { id: (req as any).userId, name: (req as any).userName } });
});

// ── Data routes ─────────────────────────────────────────────────────
app.get('/api/categories', authenticate, (_req, res) => {
  const categories = db.prepare('SELECT id, name, name_es AS "nameEs", amount, icon, color FROM categories ORDER BY sort_order').all();
  res.json(categories);
});

app.get('/api/transactions', authenticate, (_req, res) => {
  const transactions = db.prepare(
    `SELECT t.id, t.category_id AS "categoryId", t.user_id AS "userId", u.name AS "userName",
            t.amount, t.type, t.note, t.created_at AS "date"
     FROM transactions t JOIN users u ON t.user_id = u.id
     ORDER BY t.created_at DESC LIMIT 50`
  ).all();
  res.json(transactions);
});

app.post('/api/transactions', authenticate, (req, res) => {
  const { categoryId, amount, type, note } = req.body;
  const userId = (req as any).userId;

  if (!categoryId || typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'Invalid transaction' });
    return;
  }
  if (type !== 'deposit' && type !== 'withdrawal') {
    res.status(400).json({ error: 'Type must be deposit or withdrawal' });
    return;
  }

  const category = db.prepare('SELECT id, amount FROM categories WHERE id = ?').get(categoryId) as { id: string; amount: number } | undefined;
  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const newAmount = type === 'deposit' ? category.amount + amount : Math.max(0, category.amount - amount);
  const txId = crypto.randomUUID();

  const execute = db.transaction(() => {
    db.prepare('INSERT INTO transactions (id, category_id, user_id, amount, type, note) VALUES (?, ?, ?, ?, ?, ?)').run(
      txId, categoryId, userId, amount, type, note || ''
    );
    db.prepare('UPDATE categories SET amount = ? WHERE id = ?').run(newAmount, categoryId);
  });
  execute();

  const tx = db.prepare(
    `SELECT t.id, t.category_id AS "categoryId", t.user_id AS "userId", u.name AS "userName",
            t.amount, t.type, t.note, t.created_at AS "date"
     FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = ?`
  ).get(txId);

  res.json({ transaction: tx, newAmount });
});

app.post('/api/auth/change-pin', authenticate, (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || !newPin || typeof newPin !== 'string' || newPin.length < 4) {
    res.status(400).json({ error: 'New PIN must be at least 4 characters' });
    return;
  }

  const stored = db.prepare("SELECT value FROM app_config WHERE key = 'pin_hash'").get() as { value: string } | undefined;
  if (!stored || hashPin(currentPin) !== stored.value) {
    res.status(401).json({ error: 'Current PIN incorrect' });
    return;
  }

  db.prepare("UPDATE app_config SET value = ? WHERE key = 'pin_hash'").run(hashPin(newPin));
  res.json({ ok: true });
});

// ── Serve frontend in production ────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stash server running on http://0.0.0.0:${PORT}`);
});
