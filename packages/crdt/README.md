# `@actual-app/crdt`

This package contains the core CRDT logic that enables Actual’s syncing. It is shared between the client and server. We may or may not follow semver when updating this package; any usage of it outside Actual is undocumented and at your own risk.

## protobuf

We use [protobuf](https://developers.google.com/protocol-buffers/) to encode messages as binary data to send across the network.

### Generating protobuf

Run `yarn proto:generate`
