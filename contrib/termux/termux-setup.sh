#!/data/data/com.termux/files/usr/bin/sh
set -eu

APP_PORT="${ACTUAL_PORT:-5006}"
APP_HOST="${ACTUAL_HOSTNAME:-127.0.0.1}"
DATA_DIR="${ACTUAL_DATA_DIR:-$HOME/actual-data}"
TOOLS_DIR="$HOME/actual-tools"
SERVICE_DIR="$PREFIX/var/service"

echo "Actual Budget Termux setup"
echo "Server URL: http://$APP_HOST:$APP_PORT"
echo "Data dir: $DATA_DIR"

echo "Installing Termux packages..."
pkg update
pkg install -y nodejs git python make clang pkg-config sqlite openssl curl termux-api termux-services

echo "Configuring npm for Android native modules..."
npm config set build_from_source true
npm config set jobs 2

echo "Installing Actual server and CLI..."
npm install -g @actual-app/sync-server @actual-app/cli

mkdir -p "$DATA_DIR" "$TOOLS_DIR" "$HOME/actual-logs" "$HOME/actual-watchdog-logs"
mkdir -p "$SERVICE_DIR/actual-budget/log" "$SERVICE_DIR/actual-watchdog/log"

cat > "$TOOLS_DIR/run-actual.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
set -eu

termux-wake-lock || true

export ACTUAL_HOSTNAME="${ACTUAL_HOSTNAME:-127.0.0.1}"
export ACTUAL_PORT="${ACTUAL_PORT:-5006}"
export ACTUAL_DATA_DIR="${ACTUAL_DATA_DIR:-$HOME/actual-data}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=384}"

mkdir -p "$ACTUAL_DATA_DIR"
echo "Actual Budget: http://$ACTUAL_HOSTNAME:$ACTUAL_PORT"
exec actual-server
EOF

cat > "$TOOLS_DIR/watchdog.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
set -eu

ACTUAL_HOST="${ACTUAL_HOSTNAME:-127.0.0.1}"
ACTUAL_PORT="${ACTUAL_PORT:-5006}"
HEALTH_URL="${ACTUAL_HEALTH_URL:-http://$ACTUAL_HOST:$ACTUAL_PORT/health}"
INTERVAL_SECONDS="${ACTUAL_WATCHDOG_INTERVAL_SECONDS:-300}"

echo "Actual watchdog polling $HEALTH_URL every $INTERVAL_SECONDS seconds"

while true; do
  termux-wake-lock || true

  if curl --silent --show-error --fail --max-time 10 "$HEALTH_URL" >/dev/null; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') healthy"
  else
    echo "$(date '+%Y-%m-%d %H:%M:%S') unhealthy; restarting actual-budget"
    sv restart actual-budget || true
  fi

  sleep "$INTERVAL_SECONDS"
done
EOF

cat > "$TOOLS_DIR/sms-to-actual.mjs" <<'EOF'
#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = Number(limitArg?.split('=')[1] ?? process.env.SMS_LIMIT ?? 200);
const accountId = process.env.ACTUAL_SMS_ACCOUNT_ID;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: 'utf8',
    ...options,
  });
  if (result.error) fail(`${command}: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${command} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function parseAmount(text) {
  const match = text.match(/(?:INR|Rs\.?|Rs|\u20B9)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (!match) return null;
  return Math.round(Number(match[1].replace(/,/g, '')) * 100);
}

function isCredit(text) {
  return /\b(credited|credit|deposited|received|refund|cashback)\b/i.test(text);
}

function isDebit(text) {
  return /\b(debited|debit|spent|withdrawn|paid|purchase|txn|transaction|sent|upi)\b/i.test(text);
}

function parsePayee(text, sender) {
  const match = text.match(/\b(?:to|at|for)\s+([A-Z0-9 ._&-]{3,40})\b/i);
  if (match) return match[1].replace(/\s+/g, ' ').trim();
  return sender || 'SMS transaction';
}

function toDate(timestamp) {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function parseSms(sms) {
  const body = String(sms.body ?? sms.message ?? '');
  const amount = parseAmount(body);
  if (!amount) return null;

  let signedAmount = null;
  if (isCredit(body)) signedAmount = amount;
  if (isDebit(body)) signedAmount = -amount;
  if (signedAmount === null) return null;

  const sender = String(sms.address ?? sms.number ?? '').trim();
  const timestamp = sms.received ?? sms.date ?? sms.time ?? Date.now();
  const importedId = createHash('sha256')
    .update([sender, timestamp, body].join('\n'))
    .digest('hex')
    .slice(0, 32);

  return {
    date: toDate(timestamp),
    amount: signedAmount,
    payee_name: parsePayee(body, sender),
    notes: `Imported from SMS sender ${sender}: ${body}`.slice(0, 500),
    imported_id: `termux-sms-${importedId}`,
  };
}

const raw = run('termux-sms-list', ['-l', String(limit), '-t', 'inbox']);
let messages;
try {
  messages = JSON.parse(raw);
} catch {
  fail('Could not parse termux-sms-list output. Install Termux:API and grant SMS permission.');
}

const transactions = messages.map(parseSms).filter(Boolean);

if (transactions.length === 0) {
  console.log('No importable debit/credit SMS messages found.');
  process.exit(0);
}

if (dryRun) {
  console.log(JSON.stringify(transactions, null, 2));
  process.exit(0);
}

if (!accountId) fail('Set ACTUAL_SMS_ACCOUNT_ID to the target Actual account id.');

run('actual', ['transactions', 'import', '--account', accountId, '--file', '-'], {
  input: JSON.stringify(transactions),
  stdio: ['pipe', 'inherit', 'inherit'],
});
EOF

cat > "$TOOLS_DIR/actual-env.example" <<'EOF'
export ACTUAL_SERVER_URL=http://127.0.0.1:5006
export ACTUAL_PASSWORD='your-server-password'
export ACTUAL_SYNC_ID='your-budget-sync-id'
export ACTUAL_SMS_ACCOUNT_ID='your-account-id'
EOF

chmod +x "$TOOLS_DIR/run-actual.sh" "$TOOLS_DIR/watchdog.sh" "$TOOLS_DIR/sms-to-actual.mjs"

cat > "$SERVICE_DIR/actual-budget/run" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
exec 2>&1
exec "$TOOLS_DIR/run-actual.sh"
EOF

cat > "$SERVICE_DIR/actual-budget/log/run" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec svlogd -tt "$HOME/actual-logs"
EOF

cat > "$SERVICE_DIR/actual-watchdog/run" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
exec 2>&1
exec "$TOOLS_DIR/watchdog.sh"
EOF

cat > "$SERVICE_DIR/actual-watchdog/log/run" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec svlogd -tt "$HOME/actual-watchdog-logs"
EOF

chmod +x "$SERVICE_DIR/actual-budget/run" "$SERVICE_DIR/actual-budget/log/run"
chmod +x "$SERVICE_DIR/actual-watchdog/run" "$SERVICE_DIR/actual-watchdog/log/run"

echo "Starting services..."
sv-enable actual-budget || true
sv-enable actual-watchdog || true
sv up actual-budget || true
sv up actual-watchdog || true

cat <<EOF

Done.

Open Actual on Android:
  http://$APP_HOST:$APP_PORT

Add that page to your home screen from Chrome for PWA-style use.

Useful commands:
  sv status actual-budget
  sv status actual-watchdog
  svlogtail actual-budget
  svlogtail actual-watchdog
  sh "$TOOLS_DIR/run-actual.sh"

SMS import:
  1. Install the Termux:API Android app from F-Droid.
  2. Grant SMS permission to Termux:API.
  3. Fill values from:
       $TOOLS_DIR/actual-env.example
  4. Preview:
       node "$TOOLS_DIR/sms-to-actual.mjs" --dry-run
  5. Import:
       node "$TOOLS_DIR/sms-to-actual.mjs"

Important Android setting:
  Disable battery optimization for Termux.

EOF
