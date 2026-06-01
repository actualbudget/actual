export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export type LogEntry = {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: 'frontend' | 'backend';
  message: string;
  stack?: string | undefined;
};

const MAX_ENTRIES = 500;

let entries: LogEntry[] = [];
let entryCounter = 0;

type LogSubscriber = (entries: LogEntry[]) => void;
const subscribers = new Set<LogSubscriber>();

function notify() {
  for (const cb of subscribers) {
    cb(entries);
  }
}

function addEntry(entry: LogEntry) {
  if (entries.length >= MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES + 1);
  }
  entries = [...entries, entry];
  notify();
}

function generateId(): string {
  entryCounter += 1;
  return `log-${Date.now()}-${entryCounter}`;
}

function serializeArgs(args: unknown[]): { message: string; stack?: string } {
  const parts: string[] = [];
  let stack: string | undefined;

  for (const arg of args) {
    if (arg instanceof Error) {
      parts.push(arg.message);
      if (arg.stack) {
        stack = arg.stack;
      }
    } else if (typeof arg === 'object' && arg !== null) {
      try {
        parts.push(JSON.stringify(arg));
      } catch {
        parts.push(String(arg));
      }
    } else {
      parts.push(String(arg));
    }
  }

  return { message: parts.join(' '), stack };
}

const levels: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

for (const level of levels) {
  const original = (console[level] as (...args: unknown[]) => void).bind(
    console,
  );
  (console[level] as (...args: unknown[]) => void) = (...args: unknown[]) => {
    original(...args);
    const { message, stack } = serializeArgs(args);
    addEntry({
      id: generateId(),
      timestamp: Date.now(),
      level,
      source: 'frontend',
      message,
      stack,
    });
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    addEntry({
      id: generateId(),
      timestamp: Date.now(),
      level: 'error',
      source: 'frontend',
      message: event.message || String(event.error),
      stack: (event.error as Error | undefined)?.stack,
    });
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason as unknown;
    const message = reason instanceof Error ? reason.message : String(reason);
    addEntry({
      id: generateId(),
      timestamp: Date.now(),
      level: 'error',
      source: 'frontend',
      message: `Unhandled rejection: ${message}`,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

export function getLogEntries(): LogEntry[] {
  return entries;
}

export function clearLogs() {
  entries = [];
  notify();
}

export function addBackendLogEntry(data: {
  level: LogLevel;
  message: string;
  stack?: string | undefined;
}) {
  addEntry({
    id: generateId(),
    timestamp: Date.now(),
    level: data.level,
    source: 'backend',
    message: data.message,
    stack: data.stack,
  });
}

export function subscribeToLogs(cb: LogSubscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
