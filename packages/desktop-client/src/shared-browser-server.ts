// SharedWorker entry point for multi-tab, multi-budget support.
//
// All coordinator logic lives in shared-browser-server-core.ts
// This file simply creates a coordinator with console forwarding
// enabled and wires it to the SharedWorkerGlobalScope.

import { createCoordinator } from './shared-browser-server-core';

const coordinator = createCoordinator({ enableConsoleForwarding: true });
(self as unknown as { onconnect: typeof coordinator.onconnect }).onconnect =
  coordinator.onconnect;
