import React from 'react';
import { ErrorIcon } from './icons';
export function ErrorScreen(_ref) {
  var _ref$translations = _ref.translations,
      translations = _ref$translations === void 0 ? {} : _ref$translations;
  var _translations$titleTe = translations.titleText,
      titleText = _translations$titleTe === void 0 ? 'Unable to fetch results' : _translations$titleTe,
      _translations$helpTex = translations.helpText,
      helpText = _translations$helpTex === void 0 ? 'You might want to check your network connection.' : _translations$helpTex;
  return /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-ErrorScreen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Screen-Icon"
  }, /*#__PURE__*/React.createElement(ErrorIcon, null)), /*#__PURE__*/React.createElement("p", {
    className: "DocSearch-Title"
  }, titleText), /*#__PURE__*/React.createElement("p", {
    className: "DocSearch-Help"
  }, helpText));
}