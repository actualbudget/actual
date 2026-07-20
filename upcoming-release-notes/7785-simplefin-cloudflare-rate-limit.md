---
category: Bugfix
authors: [dikshit-n]
---

Fix SimpleFIN status check incorrectly showing the "Set Up SimpleFIN" modal when SimpleFIN's API is rate-limited upstream. The status check now returns a structured rate-limited response so the existing configuration is preserved during transient Cloudflare blocks.
