# rtl-detect
[![Build Status](https://travis-ci.org/shadiabuhilal/rtl-detect.svg)](https://travis-ci.org/shadiabuhilal/rtl-detect)

This library will help you to detect if the locale is right-to-left language or not.



## Usage

### require rtl-detect lib
```js
var rtlDetect = require('rtl-detect');
```

### isRtlLang
This function will check if the locale is right-to-left language or not.

Examples:

```js
var isRtl = rtlDetect.isRtlLang('ar-JO');
// isRtl will be true
```

```js
var isRtl = rtlDetect.isRtlLang('ar_JO');
// isRtl will be true
```

```js
var isRtl = rtlDetect.isRtlLang('ar');
// isRtl will be true
```

```js
var isRtl = rtlDetect.isRtlLang('en-US');
// isRtl will be false
```

### getLangDir
This function will get language direction for the locale.

Examples:

```js
var langDir = rtlDetect.getLangDir('ar-JO');
// langDir will be 'rtl'
```

```js
var langDir = rtlDetect.getLangDir('ar_JO');
// langDir will be 'rtl'
```

```js
var langDir = rtlDetect.getLangDir('ar');
// langDir will be 'rtl'
```

```js
var langDir = rtlDetect.getLangDir('en-US');
// langDir will be 'ltr'
```

Copyright 2015, Yahoo! Inc.