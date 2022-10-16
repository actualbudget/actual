# Changelog

### 4.0.3

- Upgraded `fbjs` to 3.0.1 which fixes [CVE-2021-27292](https://www.whitesourcesoftware.com/vulnerability-database/CVE-2021-27292)

### 4.0.2

- Added support for `UNSAFE_componentWillReceiveProps` lifecycle method

### 4.0.1

- Upgrade `fbemitter` dependency to 3.x

### 4.0.0

- Upgrade `fbjs` dependency to ^3.x
- Upgrade for Babel 7 compatibility (#495) (thanks to @koba04)
- Added React 17 as a peer dependency

### 3.1.3

- Added support for React 16

### 3.1.2

- No meaningful changes.

### 3.1.1

- No meaningful changes.

### 3.1.0

- `Dispatcher`: Methods `register` and `unregister` can once again be called in
  the middle of a dispatch.

### 3.0.0

- `FluxMapStore`: Removed. It added very little value over `FluxReduceStore`.
- `FluxContainer`: Subscriptions are setup in constructor rather than
  `componentDidMount`
- `FluxContainer`: Can create containers using stateless functional components
- `FluxContainer`: Uses functional version of `setState`
- `FluxMixin`: Subscriptions are setup in `componentWillMount` rather than
  `componentDidMount`
- `Dispatcher`: Methods `register` and `unregister` can not be called in the
  middle of a dispatch
- `React` added as peer dependency to `flux/utils`
- Package `dist/FluxUtils.js` alongside `dist/Flux.js`

_**Note**: This is marked as a breaking change due to the large number of small
changes in `FluxContainer`. Depending on how coupled code is to the timing of
`componentWillMount`, `componentDidMount`, or setting state synchronously it is
possible that there may be some breakages. Generally it should not be an issue._

### 2.1.1

- Publish `dist/` on npm

### 2.1.0

- Add flux-utils which include four main base classes: `Store`, `ReduceStore`,
  `MapStore`, `Container`
- Add flux-utils example and documentation
- Upgrade build script
- Publish a minified version of `Flux` in `dist/`
- Add flow types to `Dispatcher`
