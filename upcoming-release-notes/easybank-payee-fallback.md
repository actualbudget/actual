---
category: Bugfixes
authors: [neuos]
---

Sometimes in easybank transactions the creditor is not provided. The formatPayeeName then falls back to debtor. But that is not correct in case of a negative booking, as it is just the account holders IBAN.
