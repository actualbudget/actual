import type { Server } from 'node:http';

export function listenWithFallback(
  server: Server,
  port: number,
  hostname: string,
  onListening: (actualHostname: string) => void,
  onError?: (err: NodeJS.ErrnoException) => void,
): void {
  const isDefaultIpv6 = hostname === '::';

  const terminate = (err: NodeJS.ErrnoException, targetHost: string) => {
    console.error(`Failed to start server on ${targetHost}:${port}:`, err);
    try {
      server.close();
    } catch {
      // server may not be listening yet or already closed
    }
    if (onError) {
      onError(err);
    }
  };

  const fallbackErrorHandler = (fallbackErr: NodeJS.ErrnoException) => {
    terminate(fallbackErr, '0.0.0.0');
  };

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
      server.once('error', fallbackErrorHandler);
      server.listen(port, '0.0.0.0', () => {
        server.removeListener('error', fallbackErrorHandler);
        onListening('0.0.0.0');
      });
      return;
    }

    terminate(err, hostname);
  };

  server.once('error', errorHandler);
  server.listen(port, hostname, () => {
    server.removeListener('error', errorHandler);
    onListening(hostname);
  });
}
