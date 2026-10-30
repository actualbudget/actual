import type { Server } from 'node:http';

// Express 5's `app.listen` calls its callback for both success and errors, so
// a failed bind (EADDRINUSE, EACCES) looked like a successful start.
export function listen(
  server: Server,
  port: number,
  hostname: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, hostname, () => {
      server.off('error', reject);
      resolve();
    });
  });
}
