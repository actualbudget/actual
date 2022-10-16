import React from 'react';
import { AlgoliaLogo } from './AlgoliaLogo';

function CommandIcon(props) {
  return /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    "aria-label": props.ariaLabel,
    role: "img"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "1.2"
  }, props.children));
}

export function Footer(_ref) {
  var _ref$translations = _ref.translations,
      translations = _ref$translations === void 0 ? {} : _ref$translations;
  var _translations$selectT = translations.selectText,
      selectText = _translations$selectT === void 0 ? 'to select' : _translations$selectT,
      _translations$selectK = translations.selectKeyAriaLabel,
      selectKeyAriaLabel = _translations$selectK === void 0 ? 'Enter key' : _translations$selectK,
      _translations$navigat = translations.navigateText,
      navigateText = _translations$navigat === void 0 ? 'to navigate' : _translations$navigat,
      _translations$navigat2 = translations.navigateUpKeyAriaLabel,
      navigateUpKeyAriaLabel = _translations$navigat2 === void 0 ? 'Arrow up' : _translations$navigat2,
      _translations$navigat3 = translations.navigateDownKeyAriaLabel,
      navigateDownKeyAriaLabel = _translations$navigat3 === void 0 ? 'Arrow down' : _translations$navigat3,
      _translations$closeTe = translations.closeText,
      closeText = _translations$closeTe === void 0 ? 'to close' : _translations$closeTe,
      _translations$closeKe = translations.closeKeyAriaLabel,
      closeKeyAriaLabel = _translations$closeKe === void 0 ? 'Escape key' : _translations$closeKe,
      _translations$searchB = translations.searchByText,
      searchByText = _translations$searchB === void 0 ? 'Search by' : _translations$searchB;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Logo"
  }, /*#__PURE__*/React.createElement(AlgoliaLogo, {
    translations: {
      searchByText: searchByText
    }
  })), /*#__PURE__*/React.createElement("ul", {
    className: "DocSearch-Commands"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /*#__PURE__*/React.createElement(CommandIcon, {
    ariaLabel: selectKeyAriaLabel
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3.53088v3c0 1-1 2-2 2H4M7 11.53088l-3-3 3-3"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "DocSearch-Label"
  }, selectText)), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /*#__PURE__*/React.createElement(CommandIcon, {
    ariaLabel: navigateDownKeyAriaLabel
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7.5 3.5v8M10.5 8.5l-3 3-3-3"
  }))), /*#__PURE__*/React.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /*#__PURE__*/React.createElement(CommandIcon, {
    ariaLabel: navigateUpKeyAriaLabel
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7.5 11.5v-8M10.5 6.5l-3-3-3 3"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "DocSearch-Label"
  }, navigateText)), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("kbd", {
    className: "DocSearch-Commands-Key"
  }, /*#__PURE__*/React.createElement(CommandIcon, {
    ariaLabel: closeKeyAriaLabel
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13.6167 8.936c-.1065.3583-.6883.962-1.4875.962-.7993 0-1.653-.9165-1.653-2.1258v-.5678c0-1.2548.7896-2.1016 1.653-2.1016.8634 0 1.3601.4778 1.4875 1.0724M9 6c-.1352-.4735-.7506-.9219-1.46-.8972-.7092.0246-1.344.57-1.344 1.2166s.4198.8812 1.3445.9805C8.465 7.3992 8.968 7.9337 9 8.5c.032.5663-.454 1.398-1.4595 1.398C6.6593 9.898 6 9 5.963 8.4851m-1.4748.5368c-.2635.5941-.8099.876-1.5443.876s-1.7073-.6248-1.7073-2.204v-.4603c0-1.0416.721-2.131 1.7073-2.131.9864 0 1.6425 1.031 1.5443 2.2492h-2.956"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "DocSearch-Label"
  }, closeText))));
}