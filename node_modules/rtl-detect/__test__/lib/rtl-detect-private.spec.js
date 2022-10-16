/* global describe, it, expect */
/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var RtlDetect = require('../../' + 'lib/rtl-detect');

describe('rtl-detect', function () {

    describe('private', function () {

        it('_escapeRegExpPattern()', function () {
            expect(RtlDetect._escapeRegExpPattern()).toBeUndefined();

            expect(RtlDetect._escapeRegExpPattern(null)).toBeNull();

            expect(RtlDetect._escapeRegExpPattern('')).toEqual('');

            expect(RtlDetect._escapeRegExpPattern(' ')).toEqual(' ');

            expect(RtlDetect._escapeRegExpPattern('[CODE]')).toEqual('\\[CODE\\]');

            expect(RtlDetect._escapeRegExpPattern('.*+^$[]()|{},-:?\\')).toEqual('\\.\\*\\+\\^\\$\\[\\]\\(\\)\\|\\{\\}\\,\\-\\:\\?\\\\');
        });

        it('_toLowerCase()', function () {
            expect(RtlDetect._toLowerCase()).toBeUndefined();

            expect(RtlDetect._toLowerCase(null)).toBeUndefined();
            expect(RtlDetect._toLowerCase(null, true)).toBeNull();

            expect(RtlDetect._toLowerCase('')).toEqual('');

            expect(RtlDetect._toLowerCase(' ')).toEqual(' ');

            expect(RtlDetect._toLowerCase('Test Code')).toEqual('test code');

            expect(RtlDetect._toLowerCase('TEST CODE')).toEqual('test code');

            expect(RtlDetect._toLowerCase('test code')).toEqual('test code');
        });

        it('_toUpperCase()', function () {
            expect(RtlDetect._toUpperCase()).toBeUndefined();

            expect(RtlDetect._toUpperCase(null)).toBeUndefined();
            expect(RtlDetect._toUpperCase(null, true)).toBeNull();

            expect(RtlDetect._toUpperCase('')).toEqual('');

            expect(RtlDetect._toUpperCase(' ')).toEqual(' ');

            expect(RtlDetect._toUpperCase('Test Code')).toEqual('TEST CODE');

            expect(RtlDetect._toUpperCase('TEST CODE')).toEqual('TEST CODE');

            expect(RtlDetect._toUpperCase('test code')).toEqual('TEST CODE');
        });

        it('_trim()', function () {
            expect(RtlDetect._trim()).toBeUndefined();
            expect(RtlDetect._trim(undefined, '-')).toBeUndefined();

            expect(RtlDetect._trim(null)).toBeUndefined();
            expect(RtlDetect._trim(null, '-')).toBeUndefined();
            expect(RtlDetect._trim(null, true)).toBeNull();
            expect(RtlDetect._trim(null, '-', true)).toBeNull();

            expect(RtlDetect._trim('')).toEqual('');
            expect(RtlDetect._trim('', '-')).toEqual('');

            expect(RtlDetect._trim(' ')).toEqual('');

            expect(RtlDetect._trim('-', '-')).toEqual('');

            expect(RtlDetect._trim('  TRIM CODE  ')).toEqual('TRIM CODE');

            expect(RtlDetect._trim('-TRIM-CODE-', '-')).toEqual('TRIM-CODE');

            expect(RtlDetect._trim('-_TRIM-_CODE_-', ['-', '_'])).toEqual('TRIM-_CODE');
        });

        it('_parseLocale()', function () {
            expect(RtlDetect._parseLocale()).toBeUndefined();

            expect(RtlDetect._parseLocale(null)).toBeUndefined();

            expect(RtlDetect._parseLocale('')).toBeUndefined();

            expect(RtlDetect._parseLocale(' ')).toBeUndefined();

            expect(RtlDetect._parseLocale('1234')).toBeUndefined();
            expect(RtlDetect._parseLocale('1a2B3c4')).toBeUndefined();

            expect(RtlDetect._parseLocale('en')).toStrictEqual({
                lang: 'en',
                countryCode: undefined
            });

            expect(RtlDetect._parseLocale('en-US')).toStrictEqual({
                lang: 'en',
                countryCode: 'US'
            });

            expect(RtlDetect._parseLocale('en_US')).toStrictEqual({
                lang: 'en',
                countryCode: 'US'
            });

            expect(RtlDetect._parseLocale('en-us')).toStrictEqual({
                lang: 'en',
                countryCode: 'US'
            });


            expect(RtlDetect._parseLocale('EN-US')).toStrictEqual({
                lang: 'en',
                countryCode: 'US'
            });


            expect(RtlDetect._parseLocale('EN-US')).toStrictEqual({
                lang: 'en',
                countryCode: 'US'
            });
        });

        it('_BIDI_RTL_LANGS', function () {
            expect(RtlDetect._BIDI_RTL_LANGS).toStrictEqual([
                'ae',
                'ar',
                'arc',
                'bcc',
                'bqi',
                'ckb',
                'dv',
                'fa',
                'glk',
                'he',
                'ku',
                'mzn',
                'nqo',
                'pnb',
                'ps',
                'sd',
                'ug',
                'ur',
                'yi'
            ]);
        });

    });

});
