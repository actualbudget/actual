/* global describe, it, expect */
/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var RtlDetect = require('../' + 'index');

describe('index', function () {

    it('isRtlLang()', function () {
        expect(RtlDetect.isRtlLang()).toBeUndefined();

        expect(RtlDetect.isRtlLang(null)).toBeUndefined();

        expect(RtlDetect.isRtlLang('')).toBeUndefined();

        expect(RtlDetect.isRtlLang(' ')).toBeUndefined();

        expect(RtlDetect.isRtlLang('1234')).toBeUndefined();

        expect(RtlDetect.isRtlLang('en')).toBeFalsy();

        expect(RtlDetect.isRtlLang('EN')).toBeFalsy();

        expect(RtlDetect.isRtlLang('en-US')).toBeFalsy();

        expect(RtlDetect.isRtlLang('en_US')).toBeFalsy();

        expect(RtlDetect.isRtlLang('en-us')).toBeFalsy();

        expect(RtlDetect.isRtlLang('ar')).toBeTruthy();

        expect(RtlDetect.isRtlLang('AR')).toBeTruthy();

        expect(RtlDetect.isRtlLang('ar-jo')).toBeTruthy();

        expect(RtlDetect.isRtlLang('ar-JO')).toBeTruthy();

        expect(RtlDetect.isRtlLang('ar_JO')).toBeTruthy();
    });

    it('getLangDir()', function () {
        expect(RtlDetect.getLangDir()).toEqual('ltr');

        expect(RtlDetect.getLangDir(null)).toEqual('ltr');

        expect(RtlDetect.getLangDir('')).toEqual('ltr');

        expect(RtlDetect.getLangDir(' ')).toEqual('ltr');

        expect(RtlDetect.getLangDir('1234')).toEqual('ltr');

        expect(RtlDetect.getLangDir('en')).toEqual('ltr');

        expect(RtlDetect.getLangDir('EN')).toEqual('ltr');

        expect(RtlDetect.getLangDir('en-US')).toEqual('ltr');

        expect(RtlDetect.getLangDir('en_US')).toEqual('ltr');

        expect(RtlDetect.getLangDir('en_US')).toEqual('ltr');

        expect(RtlDetect.getLangDir('en-us')).toEqual('ltr');

        expect(RtlDetect.getLangDir('ar')).toEqual('rtl');

        expect(RtlDetect.getLangDir('AR')).toEqual('rtl');

        expect(RtlDetect.getLangDir('ar-jo')).toEqual('rtl');

        expect(RtlDetect.getLangDir('ar-JO')).toEqual('rtl');

        expect(RtlDetect.getLangDir('ar_JO')).toEqual('rtl');
    });

});
