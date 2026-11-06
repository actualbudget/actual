# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: open the
[Security tab](https://github.com/actualbudget/actual/security) of this
repository and choose **Report a vulnerability**. Do not open a public issue
for security problems.

Include the affected version, your deployment setup (single-user or multi-user
with OpenID), and steps to reproduce.

## Supported versions

Only the latest release receives security fixes.

## Threat model

Actual is a self-hosted personal finance app. Each sync server is run by its
owner for themselves, or shared with people they trust, such as family members.
Running Actual as a hosted or managed service for untrusted users is not a
supported deployment.

In a multi-user (OpenID) setup, user roles (Basic / Admin) and budget
ownership are there to organise who manages what. They are **not** a security
boundary between users on the same server: everyone with an account is treated
as trusted.

## Out of scope

The following behaviour is intended and will not be treated as a
vulnerability:

- **Shared bank-sync credentials.** An admin can configure server-wide (global)
  credentials for bank-sync providers (GoCardless, Enable Banking, SimpleFIN,
  Pluggy.ai, Akahu and others). Any signed-in user on that server can use them.
  This feature will remain alongside per-budget credentials; a budget that has
  its own credentials uses those instead of the global ones.

  For some providers (for example SimpleFIN and Akahu) the global credential is
  tied to the bank connections of the person who set it up. Every user on the
  server can then read the accounts and transactions behind it. Admins who do
  not want that should use per-budget credentials where the provider supports
  them, or not set up global credentials for that provider.

- Issues that need a malicious user who already has an account on the server,
  where the impact is limited to data or features of that same server.

- Issues that need control of the server host, its configuration, or its
  environment variables.
