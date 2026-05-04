// Bootstrap entry point. Statically imports register-loader.mjs (which
// installs the TS-source/extension/directory-index resolver), then
// dynamic-imports the built app so its module graph is resolved through
// that loader. Used in environments where Node's --import flag isn't
// honored, e.g. Electron's utilityProcess.fork.
import './register-loader.mjs';

await import('./build/app.js');
