# Architecture Decision Records

The core maintainers sometimes make decisions that are non-obvious or controversial. We record them here so that the rationale is clear for contributors and users, and so we can refer back to them when similar questions come up.

We are open to revisiting these decisions if someone with more experience or knowledge proposes a better approach.

---

## Bank sync: credential storage

**Decision:** Bank sync credentials are stored on the sync server in plain text. They are not encrypted on the client and are not stored in the budget file.

**Rationale:** Encrypting credentials on the client (or making encryption optional) does not materially improve security. If the server is compromised, secrets still need to be decrypted during normal operation and can be obtained at that point. Keeping credentials only on the server avoids exposing them to extensions and plugins, which would increase the attack surface. Actual Budget does not provide strong isolation between untrusted users on a shared instance; users who need isolation should run separate instances.

**Consequences:** The design stays simpler, security guarantees are clearer, and maintenance cost is lower. Server administrators can access credentials, and a compromised server is not protected by encryption.
