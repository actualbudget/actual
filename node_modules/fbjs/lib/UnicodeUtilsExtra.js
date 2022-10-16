/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @typechecks
 */

/**
 * Unicode-enabled extra utility functions not always needed.
 */
'use strict';

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var UnicodeUtils = require("./UnicodeUtils");
/**
 * @param {number} codePoint  Valid Unicode code-point
 * @param {number} len        Zero-padded minimum width of result
 * @return {string}           A zero-padded hexadecimal string (00XXXX)
 */


function zeroPaddedHex(codePoint, len) {
  var codePointHex = codePoint.toString(16).toUpperCase();
  var numZeros = Math.max(0, len - codePointHex.length);
  var result = '';

  for (var i = 0; i < numZeros; i++) {
    result += '0';
  }

  result += codePointHex;
  return result;
}
/**
 * @param {number} codePoint  Valid Unicode code-point
 * @return {string}           A formatted Unicode code-point string
 *                            of the format U+XXXX, U+XXXXX, or U+XXXXXX
 */


function formatCodePoint(codePoint) {
  codePoint = codePoint || 0; // NaN --> 0

  var formatted = '';

  if (codePoint <= 0xFFFF) {
    formatted = zeroPaddedHex(codePoint, 4);
  } else {
    formatted = codePoint.toString(16).toUpperCase();
  }

  return 'U+' + formatted;
}
/**
 * Get a list of formatted (string) Unicode code-points from a String
 *
 * @param {string} str        Valid Unicode string
 * @return {array<string>}    A list of formatted code-point strings
 */


function getCodePointsFormatted(str) {
  var codePoints = UnicodeUtils.getCodePoints(str);
  return codePoints.map(formatCodePoint);
}

var specialEscape = {
  0x07: '\\a',
  0x08: '\\b',
  0x0C: '\\f',
  0x0A: '\\n',
  0x0D: '\\r',
  0x09: '\\t',
  0x0B: '\\v',
  0x22: '\\"',
  0x5c: '\\\\'
};
/**
 * Returns a double-quoted PHP string with all non-printable and
 * non-US-ASCII sequences escaped.
 *
 * @param {string} str Valid Unicode string
 * @return {string}    Double-quoted string with Unicode sequences escaped
 */

function phpEscape(s) {
  var result = '"';

  var _iterator = _createForOfIteratorHelper(UnicodeUtils.getCodePoints(s)),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var cp = _step.value;
      var special = specialEscape[cp];

      if (special !== undefined) {
        result += special;
      } else if (cp >= 0x20 && cp <= 0x7e) {
        result += String.fromCodePoint(cp);
      } else if (cp <= 0xFFFF) {
        result += "\\u{" + zeroPaddedHex(cp, 4) + '}';
      } else {
        result += "\\u{" + zeroPaddedHex(cp, 6) + '}';
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  result += '"';
  return result;
}
/**
 * Returns a double-quoted Java or JavaScript string with all
 * non-printable and non-US-ASCII sequences escaped.
 *
 * @param {string} str Valid Unicode string
 * @return {string}    Double-quoted string with Unicode sequences escaped
 */


function jsEscape(s) {
  var result = '"';

  for (var i = 0; i < s.length; i++) {
    var cp = s.charCodeAt(i);
    var special = specialEscape[cp];

    if (special !== undefined) {
      result += special;
    } else if (cp >= 0x20 && cp <= 0x7e) {
      result += String.fromCodePoint(cp);
    } else {
      result += "\\u" + zeroPaddedHex(cp, 4);
    }
  }

  result += '"';
  return result;
}

function c11Escape(s) {
  var result = '';

  var _iterator2 = _createForOfIteratorHelper(UnicodeUtils.getCodePoints(s)),
      _step2;

  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var cp = _step2.value;
      var special = specialEscape[cp];

      if (special !== undefined) {
        result += special;
      } else if (cp >= 0x20 && cp <= 0x7e) {
        result += String.fromCodePoint(cp);
      } else if (cp <= 0xFFFF) {
        result += "\\u" + zeroPaddedHex(cp, 4);
      } else {
        result += "\\U" + zeroPaddedHex(cp, 8);
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }

  return result;
}
/**
 * Returns a double-quoted C string with all non-printable and
 * non-US-ASCII sequences escaped.
 *
 * @param {string} str Valid Unicode string
 * @return {string}    Double-quoted string with Unicode sequences escaped
 */


function cEscape(s) {
  return 'u8"' + c11Escape(s) + '"';
}
/**
 * Returns a double-quoted Objective-C string with all non-printable
 * and non-US-ASCII sequences escaped.
 *
 * @param {string} str Valid Unicode string
 * @return {string}    Double-quoted string with Unicode sequences escaped
 */


function objcEscape(s) {
  return '@"' + c11Escape(s) + '"';
}
/**
 * Returns a double-quoted Python string with all non-printable
 * and non-US-ASCII sequences escaped.
 *
 * @param {string} str Valid Unicode string
 * @return {string}    Double-quoted string with Unicode sequences escaped
 */


function pyEscape(s) {
  return 'u"' + c11Escape(s) + '"';
}

var UnicodeUtilsExtra = {
  formatCodePoint: formatCodePoint,
  getCodePointsFormatted: getCodePointsFormatted,
  zeroPaddedHex: zeroPaddedHex,
  phpEscape: phpEscape,
  jsEscape: jsEscape,
  cEscape: cEscape,
  objcEscape: objcEscape,
  pyEscape: pyEscape
};
module.exports = UnicodeUtilsExtra;