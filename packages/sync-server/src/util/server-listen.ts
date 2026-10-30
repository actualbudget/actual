import type { Server } from 'node:net';

export function listen(
  server: Server,
  port: number,
  hostname: string,
  onListening: (address: string) => void,
): void {
  // Without a host, Node binds to `::` and falls back to `0.0.0.0` when IPv6 is unavailable
  server.listen(port, hostname === '::' ? undefined : hostname, () => {
    const address = server.address();
    onListening(
      address && typeof address === 'object' ? address.address : hostname,
    );
  });
}
