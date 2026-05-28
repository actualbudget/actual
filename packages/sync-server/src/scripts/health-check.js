import { config } from '#load-config';

const protocol =
  config.get('https.key') && config.get('https.cert') ? 'https' : 'http';
// When the server binds the `::` wildcard it accepts IPv4 connections too,
// and on IPv6-disabled hosts it falls back to `0.0.0.0`. Probe the explicit
// IPv4 loopback rather than `localhost` to avoid musl/glibc DNS resolving to
// an IPv6 address the server may not be listening on.
const hostname =
  config.get('hostname') === '::' ? '127.0.0.1' : config.get('hostname');

fetch(`${protocol}://${hostname}:${config.get('port')}/health`)
  .then(res => res.json())
  .then(res => {
    if (res.status !== 'UP') {
      throw new Error(
        'Health check failed: Server responded to health check with status ' +
          res.status,
      );
    }
  })
  .catch(err => {
    console.log('Health check failed:', err);
    process.exit(1);
  });
