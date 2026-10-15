import type { Server } from 'node:http';

export function listenWithFallback(
  server: Server,
  port: number,
  hostname: string,
  onListening: (actualHostname: string) => void,
): void {
  const isDefaultIpv6 = hostname === '::';

  const errorHandler = (err: NodeJS.ErrnoException) => {
    // If IPv6 binding fails (e.g. IPv6 disabled on the host, EINVAL, EAFNOSUPPORT, EADDRNOTAVAIL, ENOTFOUND)
    // and the hostname was the default '::', attempt to fall back to IPv4 '0.0.0.0'.
    if (
      isDefaultIpv6 &&
      (err.code === 'EAFNOSUPPORT' ||
        err.code === 'EADDRNOTAVAIL' ||
        err.code === 'EINVAL' ||
        err.code === 'ENOTFOUND')
    ) {
      console.warn(
        `Failed to bind to IPv6 address '::' (${err.code}). Falling back to IPv4 '0.0.0.0'...`,
      );
      server.removeListener('error', errorHandler);
      server.listen(port, '0.0.0.0', () => {
        onListening('0.0.0.0');
      });
      return;
    }

    console.error(`Failed to start server on ${hostname}:${port}:`, err);
    throw err;
  };

  server.once('error', errorHandler);
  server.listen(port, hostname, () => {
    server.removeListener('error', errorHandler);
    onListening(hostname);
  });
}
