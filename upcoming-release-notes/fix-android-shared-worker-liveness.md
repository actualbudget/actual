---
category: Bugfixes
authors: [martin-lukas]
---

Android can kill the shared worker process while the PWA is in the background, which will make the app unresponsive on reopening. The fix is to detect when the shared worker isn't responsive anymore, and quickly reload to recover the PWA state.
