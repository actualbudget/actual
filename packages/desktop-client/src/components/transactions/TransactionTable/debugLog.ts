// Debug helper for sending instrumentation data
export function debugLog(event: string, data: unknown) {
  if (process.env.NODE_ENV === 'development') {
    void fetch('http://localhost:9999/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }).catch(() => {
      // Silently fail if debug server is not running
    });
  }
}
