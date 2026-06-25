// SharedWorker entry point for multi-tab, multi-budget support.
//
// This is the bundler entry (imported via `?sharedworker`); all coordinator
// logic lives in loot-core. This file simply creates a coordinator with
// console forwarding enabled and wires it to the SharedWorkerGlobalScope.

import { createCoordinator } from '@actual-app/core/platform/client/browser-server/coordinator';

const coordinator = createCoordinator({ enableConsoleForwarding: true });
(self as unknown as { onconnect: typeof coordinator.onconnect }).onconnect =
  coordinator.onconnect;
