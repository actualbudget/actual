# react-textarea-autosize

## 8.3.4

### Patch Changes

- [#341](https://github.com/Andarist/react-textarea-autosize/pull/341) [`9124bbf`](https://github.com/Andarist/react-textarea-autosize/commit/9124bbf71e82d9123c5dff2c3b008d33a54fc884) Thanks [@rebelliard](https://github.com/rebelliard)! - Add React 18 to the allowed peer dependency range.

## 8.3.3

### Patch Changes

- [`0d7ac21`](https://github.com/Andarist/react-textarea-autosize/commit/0d7ac21f1dadf1fb9070aea5f76f20b7ce2f24bc) [#326](https://github.com/Andarist/react-textarea-autosize/pull/326) Thanks [@karlingen](https://github.com/karlingen)! - Account for `word-break` property when calculating the height.

* [`6336448`](https://github.com/Andarist/react-textarea-autosize/commit/63364489ca172b800663b8086757d719d911a2f5) [#327](https://github.com/Andarist/react-textarea-autosize/pull/327) Thanks [@circlingthesun](https://github.com/circlingthesun)! - Fixed the `tabindex` attribute name that is set on the hidden textarea used for height calculations.

## 8.3.2

### Patch Changes

- [`3c71884`](https://github.com/Andarist/react-textarea-autosize/commit/3c7188444e66e0e199d90fbfec554f2b97695f38) [#311](https://github.com/Andarist/react-textarea-autosize/pull/311) Thanks [@Andarist](https://github.com/Andarist)! - Changed `TextareaAutosizeProps` to a TS interface which fixes the problem of "resolved" being type alias being inlined in the emitted types declaration which could cause incompatibilities with some versions of `@types/react`.

## 8.3.1

### Patch Changes

- [`49d7d04`](https://github.com/Andarist/react-textarea-autosize/commit/49d7d04737136bea93b17f3c7eadb675a10a25ae) [#305](https://github.com/Andarist/react-textarea-autosize/pull/305) Thanks [@mxschmitt](https://github.com/mxschmitt)! - Moved internal `'resize'` listener to the layout effect since React 17 calls cleanups of regular effects asynchronously. This ensures that we don't ever try to access the already unmounted ref in our listener.

## 8.3.0

### Minor Changes

- [`a16a46d`](https://github.com/Andarist/react-textarea-autosize/commit/a16a46d5dc19772fbdc9f58481699b99b485b9a3) [#296](https://github.com/Andarist/react-textarea-autosize/pull/296) Thanks [@RDIL](https://github.com/RDIL)! - Allow React 17 in the specified peer dependency range.

## 8.2.0

### Minor Changes

- [`a1fc99f`](https://github.com/Andarist/react-textarea-autosize/commit/a1fc99f79fa28b5518f1c5e937f765ace46f68c2) [#284](https://github.com/Andarist/react-textarea-autosize/pull/284) Thanks [@emmenko](https://github.com/emmenko)! - Added `{ rowHeight: number }` as a second parameter to the `onHeightChange` callback. This is useful to construct custom behaviors according to the height values.

## 8.1.1

### Patch Changes

- [`b7c227a`](https://github.com/Andarist/react-textarea-autosize/commit/b7c227a16b848b8bd6090566f3d151d4ffbe8515) [#280](https://github.com/Andarist/react-textarea-autosize/pull/280) Thanks [@emdotem](https://github.com/emdotem)! - Fixed a broken call to `setProperty` that has prevented the library to work correctly.

## 8.1.0

### Minor Changes

- [`722e10a`](https://github.com/Andarist/react-textarea-autosize/commit/722e10a0a446c2b9a51f1526895e47538b3d9f5a) [#278](https://github.com/Andarist/react-textarea-autosize/pull/278) Thanks [@emdotem](https://github.com/emdotem)! - Set inline style's `height` property with the `"important"` priority.

### Patch Changes

- [`db872f0`](https://github.com/Andarist/react-textarea-autosize/commit/db872f035e8c033eb96c40eead9c041ec6b2e09f) Thanks [@Andarist](https://github.com/Andarist)! - `TextareaAutosizeProps` are now based on `React.TextareaHTMLAttributes<HTMLTextAreaElement>` instead of `JSX.IntrinsicElements['textarea']`. The latter one includes a type for `ref` attribute and it being included as part of `TextareaAutosizeProps` has caused problems when using `TextareaAutosizeProps` to declare wrapper components. This is also more semantically correct as `ref` shouldn't be a part of `props`. It's rather accepted by a particular JSX element and in case of the `react-textarea-autosize` this is the type of the exported component which is `React.ForwardRefExoticComponent<TextareaAutosizeProps>` (a result of `React.forwardRef` call).

* [`61ca826`](https://github.com/Andarist/react-textarea-autosize/commit/61ca826a3fbe33abb9c67885d5bbd7b34ecd66db) Thanks [@Andarist](https://github.com/Andarist)! - `maxHeight` and `minHeight` has been disallowed as part of `TextareaAutosizeProps['style']`. The intention to do that was there since the v8 release but it was not implemented correctly and allowed those to slip into the mentioned type.

## 8.0.1

### Patch Changes

- [`2307033`](https://github.com/Andarist/react-textarea-autosize/commit/230703341e366ad861e3a24e20f1d9fd6f9ced47) [#266](https://github.com/Andarist/react-textarea-autosize/pull/266) Thanks [@vlazh](https://github.com/vlazh)! - Fixed a regression with calculating too high height for textareas with `box-sizing: border-box;`.

* [`1d1bba2`](https://github.com/Andarist/react-textarea-autosize/commit/1d1bba23140a7948b34a1cb9678802c71744b0f4) [#265](https://github.com/Andarist/react-textarea-autosize/pull/265) Thanks [@SimenB](https://github.com/SimenB)! - Exported `TextareaAutosizeProps` type for convenience.

- [`da960f4`](https://github.com/Andarist/react-textarea-autosize/commit/da960f46084f3b584506f3513b77958d5265fcad) Thanks [@Andarist](https://github.com/Andarist)! - Fixed an issue with internal cache not being populated correctly when using `cacheMeasurements` prop.

## 8.0.0

### Major Changes

- The package has been rewritten in TypeScript so type definitions are now included in the package itself. There is no need to install separate types from the [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped).
- At the same time the package internals have been rewritten to use React's [hooks API](https://reactjs.org/docs/hooks-intro.html). This means that the peer dependency requirement for React version had to be changed to `^16.8.0`.
- You can now use `ref` prop to get access to the underlaying `textarea` element as [`React.forwardRef`](https://reactjs.org/docs/react-api.html#reactforwardref) is being used now. The support for `innerRef` has been completely removed.
- `useCacheForDOMMeasurements` prop has been renamed to `cacheMeasurements`.
- `onHeightChange` callback no longer receives the second argument. It was the component's instance (its `this`), but as the component is now implemented using hooks there no longer is any instance that could be given to a consumer like that.
- Removed handling `props.style.maxHeight` and `props.style.minHeight` values. If you need to control those boundaries you should use `maxRows` and `minRows` props respectively.

### Minor Changes

- The height is being set now directly on the underlaying `textarea` element and not caused by updating internal state and this triggering React's rerender. This shouldn't make for any observable difference for consumers of this package.
