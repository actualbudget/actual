# Architecture Notes

If you wish to contribute to actual, these details are not essential but can be useful for navigating the structure of the code.

When actual runs, it runs the front-end react based web app, as well as a local in-browser database server. You may see these informally referred to as 'frontend' and 'backend' - not to be confused with the sync-server or some other type of remote 'backend' (which doesn't exist).

In the web app, this background server runs in a [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), and in the electron app it spins up a [background process](https://nodejs.org/dist/latest-v16.x/docs/api/child_process.html#child_processforkmodulepath-args-options) which communicates over [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API).

The code which is used by this background server, as well as code which is shared across the web app and desktop versions of actual typically lives inside the `loot-core` package.
