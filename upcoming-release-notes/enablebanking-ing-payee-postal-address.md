---
category: Bugfixes
authors: [roblaszczak]
---

Enable Banking: derive the payee from `postal_address.address_line` when a bank (e.g. ING) leaves the structured `creditor`/`debtor` name empty, so the payee is the real counterparty instead of a copy of the notes.
