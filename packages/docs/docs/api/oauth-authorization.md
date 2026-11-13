---
title: Application authorization
---

Actual supports the OAuth 2.0 authorization-code flow with PKCE (`S256`) for
administrator-registered public clients. Each approved grant creates an API key
limited to one budget. The key remains valid until revoked.

## Server configuration

Register clients in `oauth.clients`, or provide the same JSON array through
`ACTUAL_OAUTH_CLIENTS`:

```json
{
  "oauth": {
    "clients": [
      {
        "clientId": "budget-automation",
        "name": "Budget automation",
        "logoUri": "https://automation.example/icon.svg",
        "redirectUris": ["https://automation.example/actual/callback"]
      }
    ]
  }
}
```

`clientId` must be unique. Register exact redirect URIs; HTTPS is required,
except for HTTP loopback addresses. `logoUri` is optional and must be an HTTPS
URL to an image supported by the user's browser. Client registration is managed
by the server administrator; dynamic registration is not supported.

Set `ACTUAL_OAUTH_ISSUER` to the public HTTPS origin to publish authorization
server metadata at `/.well-known/oauth-authorization-server`.

## Client flow

Use an OAuth 2.0 client implementation with PKCE (`S256`). It should generate
and retain a random `state` and `code_verifier`, then redirect the user to
`/oauth/authorize` with these values:

| Parameter               | Value                                      |
| ----------------------- | ------------------------------------------ |
| `response_type`         | `code`                                     |
| `client_id`             | Registered client ID                       |
| `redirect_uri`          | Exactly registered callback URI            |
| `state`                 | Client-generated value, returned unchanged |
| `code_challenge`        | PKCE challenge                             |
| `code_challenge_method` | `S256`                                     |

After approval, Actual redirects to the registered callback with a short-lived
`code` and the original `state`. On denial, it returns `error=access_denied` and
`state`. The client must validate the returned state.

The client exchanges the code at `/oauth/token` using the original verifier.
Codes expire after two minutes and can be used once. The response contains an
`access_token` and `token_type: "Bearer"`.

Pass `access_token` to the Actual SDK as `sessionToken`; the SDK handles
authenticated budget requests. The token is limited to the approved budget,
remains subject to its owner's current access, and does not grant
server-administration access.

The client can revoke a token at `/oauth/revoke`. Unknown tokens return success;
a client can revoke only tokens issued to itself.

Dynamic client registration, refresh tokens, and arbitrary OAuth scopes are not
supported.
