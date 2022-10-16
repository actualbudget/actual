var _excluded = ["translations"];

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

import React from 'react';
import { NoResultsIcon } from './icons';
export function NoResultsScreen(_ref) {
  var _ref$translations = _ref.translations,
      translations = _ref$translations === void 0 ? {} : _ref$translations,
      props = _objectWithoutProperties(_ref, _excluded);

  var _translations$noResul = translations.noResultsText,
      noResultsText = _translations$noResul === void 0 ? 'No results for' : _translations$noResul,
      _translations$suggest = translations.suggestedQueryText,
      suggestedQueryText = _translations$suggest === void 0 ? 'Try searching for' : _translations$suggest,
      _translations$reportM = translations.reportMissingResultsText,
      reportMissingResultsText = _translations$reportM === void 0 ? 'Believe this query should return results?' : _translations$reportM,
      _translations$reportM2 = translations.reportMissingResultsLinkText,
      reportMissingResultsLinkText = _translations$reportM2 === void 0 ? 'Let us know.' : _translations$reportM2;
  var searchSuggestions = props.state.context.searchSuggestions;
  return /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-NoResults"
  }, /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Screen-Icon"
  }, /*#__PURE__*/React.createElement(NoResultsIcon, null)), /*#__PURE__*/React.createElement("p", {
    className: "DocSearch-Title"
  }, noResultsText, " \"", /*#__PURE__*/React.createElement("strong", null, props.state.query), "\""), searchSuggestions && searchSuggestions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-NoResults-Prefill-List"
  }, /*#__PURE__*/React.createElement("p", {
    className: "DocSearch-Help"
  }, suggestedQueryText, ":"), /*#__PURE__*/React.createElement("ul", null, searchSuggestions.slice(0, 3).reduce(function (acc, search) {
    return [].concat(_toConsumableArray(acc), [/*#__PURE__*/React.createElement("li", {
      key: search
    }, /*#__PURE__*/React.createElement("button", {
      className: "DocSearch-Prefill",
      key: search,
      type: "button",
      onClick: function onClick() {
        props.setQuery(search.toLowerCase() + ' ');
        props.refresh();
        props.inputRef.current.focus();
      }
    }, search))]);
  }, []))), props.getMissingResultsUrl && /*#__PURE__*/React.createElement("p", {
    className: "DocSearch-Help"
  }, "".concat(reportMissingResultsText, " "), /*#__PURE__*/React.createElement("a", {
    href: props.getMissingResultsUrl({
      query: props.state.query
    }),
    target: "_blank",
    rel: "noopener noreferrer"
  }, reportMissingResultsLinkText)));
}