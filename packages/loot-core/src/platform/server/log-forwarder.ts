import * as connection from '#platform/server/connection';
import type { LogLevel } from '#types/server-events';

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

export function initLogForwarding() {
  const levels: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

  for (const level of levels) {
    const original = (console[level] as (...args: unknown[]) => void).bind(
      console,
    );
    (console[level] as (...args: unknown[]) => void) = (...args: unknown[]) => {
      original(...args);
      const { message, stack } = serializeArgs(args);
      connection.send('log-event', { level, message, stack });
    };
  }
}
