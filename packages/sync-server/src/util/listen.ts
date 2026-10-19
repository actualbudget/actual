import type { Server } from 'node:net';

/**
 * Render a failure to bind the listen socket as a message an operator can act
 * on. `hostname` falls back to `::` — the value the server config defaults to —
 * so the message names the address that was actually attempted.
 */
export function describeListenError(
  err: Error,
  port: number,
  hostname?: string,
): string {
  const target = `${hostname ?? '::'}:${port}`;
  const code = 'code' in err && typeof err.code === 'string' ? err.code : '';

  switch (code) {
    case 'EAFNOSUPPORT':
      return (
        `Failed to listen on ${target}: this host does not support IPv6. ` +
        `Set \`hostname\` to '0.0.0.0' in your config (or ACTUAL_HOSTNAME=0.0.0.0), ` +
        `or enable IPv6, and start the server again.`
      );
    case 'EADDRINUSE':
      return `Failed to listen on ${target}: the port is already in use. Pick a different \`port\`, or stop the process that holds it.`;
    case 'EACCES':
      return `Failed to listen on ${target}: permission denied. Ports below 1024 usually require elevated privileges.`;
    default:
      return `Failed to listen on ${target}: ${err.message}`;
  }
}

/**
 * Bind `server` and resolve once it is listening.
 *
 * Node reports bind failures through an `error` event rather than by throwing.
 * Left unhandled that surfaces as an uncaught exception, which is why a server
 * that cannot bind its configured address looks like it exits for no reason.
 * Converting the failure into a rejection — carrying `describeListenError`'s
 * message — lets the caller report it and exit with a non-zero status.
 *
 * The listener covers the startup window only: it is removed as soon as the
 * server is listening, so a runtime server error afterwards keeps Node's
 * default uncaught-exception behaviour instead of being swallowed.
 */
export function startListening(
  server: Server,
  port: number,
  hostname?: string,
  onListening?: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      reject(new Error(describeListenError(err, port, hostname)));
    };
    server.once('error', onError);

    server.listen(port, hostname, () => {
      server.off('error', onError);
      onListening?.();
      resolve();
    });
  });
}
