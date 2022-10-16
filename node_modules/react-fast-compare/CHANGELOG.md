# Changelog

## 3.2.0 (2020-05-28)

- [#80](https://github.com/FormidableLabs/react-fast-compare/pull/80). Update types to use generic `any`s.
- [#77](https://github.com/FormidableLabs/react-fast-compare/pull/77). Add tests for our TypeScript type definitions.

## 3.1.0 (2020-05-08)

- [#76](https://github.com/FormidableLabs/react-fast-compare/pull/76). Add support for preact/compat.
- [#75](https://github.com/FormidableLabs/react-fast-compare/pull/75). Drop test support for Node 8.
- [#62](https://github.com/FormidableLabs/react-fast-compare/pull/62). Fix TypeScript types by declaring a function instead of a module.

## 3.0.2 (2020-05-01)

- [#71](https://github.com/FormidableLabs/react-fast-compare/pull/71). Extend the `hasArrayBuffer` check to support older IE 11 versions.

## 3.0.1 (2020-02-05)

- [#60](https://github.com/FormidableLabs/react-fast-compare/pull/60). Update documentation on bundle size.

## 3.0.0 (2020-01-05)

**Features:**

- [#36](https://github.com/FormidableLabs/react-fast-compare/pull/36). Update to `fast-deep-equal@3.1.1` with modified support for ES.next data types: `Map`, `Set`, `ArrayBuffer`.
- [#57](https://github.com/FormidableLabs/react-fast-compare/pull/57). Minor refactoring to reduce min+gz size.
- [#59](https://github.com/FormidableLabs/react-fast-compare/pull/59). Rename exported to `isEqual` for TypeScript users.

**Breaking changes:**

- instances of different classes are now considered unequal
- support for ES6 Map and Set instances
- support for ES6 typed arrays

**Infrastructure:**

- Upgrade lots of `devDependenices`
- Use `fast-deep-equal` tests directly in our correctness tests.
- Update CI to modern Node.js versions.
- Update Appveyor to use straight IE11 (not emulated IE9) because mocha no longer runs in IE9.

## 2.0.4 (2018-11-09)

- [#39](https://github.com/FormidableLabs/react-fast-compare/pull/39). Fix `react-native` bug introduced by DOM element checking.

## 2.0.3 (2018-11-08)

- [#33](https://github.com/FormidableLabs/react-fast-compare/pull/33). Add handling for DOM elements. Thanks @viper1104!

## 2.0.2 (2018-08-21)

- [#28](https://github.com/FormidableLabs/react-fast-compare/pull/28). Fix for localized versions of IE11. Thanks @excentrik!
- [#34](https://github.com/FormidableLabs/react-fast-compare/pull/34). Fix typo. Thanks @Marviel!

## 2.0.1 (2018-06-25)

- [#26](https://github.com/FormidableLabs/react-fast-compare/pull/26). Remove `_store` check. Thanks @chen-ye!

**Major bugfix:** Fixes `RangeError` in production, [#25](https://github.com/FormidableLabs/react-fast-compare/issues/25)

## 2.0.0 (2018-06-04)

- [#21](https://github.com/FormidableLabs/react-fast-compare/pull/21). Upgrade to `fast-deep-equal@2.0.1`. Thanks @samwhale!

**Breaking changes:**

- `null` and `Object` comparison
- new behavior: functions are no longer treated as equal
- new behavior: handle `NaN`

## 1.0.0 (2018-04-12)

- Initial release. forked from `fast-deep-equal@1.1.0`
