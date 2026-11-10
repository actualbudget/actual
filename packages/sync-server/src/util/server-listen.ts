import type { Server } from 'node:net';

export function listen(
  server: Server,
  port: number,
  hostname: string,
  onListening: (address: string) => void,
): void {
  // Omitting the host lets Node fall back to `0.0.0.0` when IPv6 is unavailable
  server.listen(port, hostname === '::' ? undefined : hostname, () => {
    const address = server.address();
    onListening(
      address && typeof address === 'object' ? address.address : hostname,
    );
  });
}
