import fs from 'fs';
import tls from 'tls';

/**
 * Adds a self-signed (or private CA) certificate to the set of CA certificates
 * that this process trusts for TLS connections, so `fetch` can reach a sync
 * server that uses it.
 *
 * This must run before any TLS connection is opened: Node only applies the
 * default CA list to connections made after it is set.
 *
 * NODE_EXTRA_CA_CERTS can't be used for this. The packaged app disables the
 * Electron `nodeOptions` fuse (to stop NODE_OPTIONS code injection), and
 * Electron ignores NODE_EXTRA_CA_CERTS whenever that fuse is disabled.
 */
export function trustSelfSignedCertificate(certificatePath: string) {
  try {
    const certificate = fs.readFileSync(certificatePath, 'utf8');
    tls.setDefaultCACertificates([
      ...tls.getCACertificates('default'),
      certificate,
    ]);
    console.info(`Trusting self-signed certificate: ${certificatePath}`);
  } catch (error) {
    // Keep starting the backend; connecting to the server will fail with a
    // certificate error the user can act on.
    console.warn(
      `Could not load the self-signed certificate at ${certificatePath}: ${String(error)}`,
    );
  }
}
