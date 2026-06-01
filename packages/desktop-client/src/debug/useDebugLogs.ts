import { useEffect, useState } from 'react';

import { clearLogs, getLogEntries, subscribeToLogs } from './logStore';
import type { LogEntry, LogLevel } from './logStore';

export type { LogEntry, LogLevel };

export function useDebugLogs() {
  const [entries, setEntries] = useState<LogEntry[]>(() => getLogEntries());

  useEffect(() => {
    const unsubscribe = subscribeToLogs(updated => {
      setEntries([...updated]);
    });
    return unsubscribe;
  }, []);

  return { entries, clearLogs };
}
