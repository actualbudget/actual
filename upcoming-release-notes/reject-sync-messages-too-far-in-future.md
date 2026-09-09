---
category: Bugfixes
authors: [jsoberg]
---

Rejects incoming messages that have a timestamp too far in the future, since they would cause permanent clock drift issues. This isolates the problem to just the client trying to send the message, rather than all clients connected to the server.
