/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var rtlDetect = require('./lib/rtl-detect');

module.exports = {

    isRtlLang: rtlDetect.isRtlLang,

    getLangDir: rtlDetect.getLangDir

};
