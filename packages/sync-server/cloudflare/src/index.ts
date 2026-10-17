// Cloudflare Workers entry point. Static web assets are served by the assets
// binding before this runs (see run_worker_first in wrangler.jsonc); API
// requests are forwarded to the single ActualServer Durable Object, which
// runs the regular Express app.

export { ActualServer } from './actual-server';
export { SyncGroup } from './sync-group';

export default {
  async fetch(request, env) {
    const headers = new Headers(request.headers);
    const clientIp = request.headers.get('cf-connecting-ip');
    if (clientIp) {
      headers.set('x-forwarded-for', clientIp);
    }

    return env.ACTUAL_SERVER.getByName('server').fetch(
      new Request(request, { headers }),
    );
  },
} satisfies ExportedHandler<Env>;
