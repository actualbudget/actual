## Generating protobuf

We use protobuf to encode messages as binary data to send across the network.

To generate the protobuf: I forget, will document this soon.

However there is one very important thing to remember! The default output includes this near the top:

```
var global = Function('return this')();
```

This will not work with our CSP directives. You must manually modify this to this:

```
var global = globalThis;
```