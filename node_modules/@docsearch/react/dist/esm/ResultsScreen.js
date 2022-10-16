function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import React from 'react';
import { SelectIcon, SourceIcon } from './icons';
import { Results } from './Results';
import { removeHighlightTags } from './utils';
export function ResultsScreen(props) {
  return /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Dropdown-Container"
  }, props.state.collections.map(function (collection) {
    if (collection.items.length === 0) {
      return null;
    }

    var title = removeHighlightTags(collection.items[0]);
    return /*#__PURE__*/React.createElement(Results, _extends({}, props, {
      key: collection.source.sourceId,
      title: title,
      collection: collection,
      renderIcon: function renderIcon(_ref) {
        var _collection$items;

        var item = _ref.item,
            index = _ref.index;
        return /*#__PURE__*/React.createElement(React.Fragment, null, item.__docsearch_parent && /*#__PURE__*/React.createElement("svg", {
          className: "DocSearch-Hit-Tree",
          viewBox: "0 0 24 54"
        }, /*#__PURE__*/React.createElement("g", {
          stroke: "currentColor",
          fill: "none",
          fillRule: "evenodd",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }, item.__docsearch_parent !== ((_collection$items = collection.items[index + 1]) === null || _collection$items === void 0 ? void 0 : _collection$items.__docsearch_parent) ? /*#__PURE__*/React.createElement("path", {
          d: "M8 6v21M20 27H8.3"
        }) : /*#__PURE__*/React.createElement("path", {
          d: "M8 6v42M20 27H8.3"
        }))), /*#__PURE__*/React.createElement("div", {
          className: "DocSearch-Hit-icon"
        }, /*#__PURE__*/React.createElement(SourceIcon, {
          type: item.type
        })));
      },
      renderAction: function renderAction() {
        return /*#__PURE__*/React.createElement("div", {
          className: "DocSearch-Hit-action"
        }, /*#__PURE__*/React.createElement(SelectIcon, null));
      }
    }));
  }), props.resultsFooterComponent && /*#__PURE__*/React.createElement("section", {
    className: "DocSearch-HitsFooter"
  }, /*#__PURE__*/React.createElement(props.resultsFooterComponent, {
    state: props.state
  })));
}