import type { Server } from 'node:net';

// Resolves with the bound address once the server is listening, and rejects if
// binding fails (EADDRINUSE, EACCES). Express 5's `app.listen` calls its
// callback for both success and errors, so a failed bind looked like a start.
export function listen(
  server: Server,
  port: number,
  hostname: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    // Omitting the host lets Node fall back to `0.0.0.0` when IPv6 is unavailable
    server.listen(port, hostname === '::' ? undefined : hostname, () => {
      server.off('error', reject);
      const address = server.address();
      resolve(
        address && typeof address === 'object' ? address.address : hostname,
      );
    });
  });
}
