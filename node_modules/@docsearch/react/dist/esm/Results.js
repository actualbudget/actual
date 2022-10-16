function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import React from 'react';
import { Snippet } from './Snippet';
export function Results(props) {
  if (!props.collection || props.collection.items.length === 0) {
    return null;
  }

  return /*#__PURE__*/React.createElement("section", {
    className: "DocSearch-Hits"
  }, /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Hit-source"
  }, props.title), /*#__PURE__*/React.createElement("ul", props.getListProps(), props.collection.items.map(function (item, index) {
    return /*#__PURE__*/React.createElement(Result, _extends({
      key: [props.title, item.objectID].join(':'),
      item: item,
      index: index
    }, props));
  })));
}

function Result(_ref) {
  var item = _ref.item,
      index = _ref.index,
      renderIcon = _ref.renderIcon,
      renderAction = _ref.renderAction,
      getItemProps = _ref.getItemProps,
      onItemClick = _ref.onItemClick,
      collection = _ref.collection,
      hitComponent = _ref.hitComponent;

  var _React$useState = React.useState(false),
      _React$useState2 = _slicedToArray(_React$useState, 2),
      isDeleting = _React$useState2[0],
      setIsDeleting = _React$useState2[1];

  var _React$useState3 = React.useState(false),
      _React$useState4 = _slicedToArray(_React$useState3, 2),
      isFavoriting = _React$useState4[0],
      setIsFavoriting = _React$useState4[1];

  var action = React.useRef(null);
  var Hit = hitComponent;

  function runDeleteTransition(cb) {
    setIsDeleting(true);
    action.current = cb;
  }

  function runFavoriteTransition(cb) {
    setIsFavoriting(true);
    action.current = cb;
  }

  return /*#__PURE__*/React.createElement("li", _extends({
    className: ['DocSearch-Hit', item.__docsearch_parent && 'DocSearch-Hit--Child', isDeleting && 'DocSearch-Hit--deleting', isFavoriting && 'DocSearch-Hit--favoriting'].filter(Boolean).join(' '),
    onTransitionEnd: function onTransitionEnd() {
      if (action.current) {
        action.current();
      }
    }
  }, getItemProps({
    item: item,
    source: collection.source,
    onClick: function onClick() {
      onItemClick(item);
    }
  })), /*#__PURE__*/React.createElement(Hit, {
    hit: item
  }, /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Hit-Container"
  }, renderIcon({
    item: item,
    index: index
  }), item.hierarchy[item.type] && item.type === 'lvl1' && /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Hit-content-wrapper"
  }, /*#__PURE__*/React.createElement(Snippet, {
    className: "DocSearch-Hit-title",
    hit: item,
    attribute: "hierarchy.lvl1"
  }), item.content && /*#__PURE__*/React.createElement(Snippet, {
    className: "DocSearch-Hit-path",
    hit: item,
    attribute: "content"
  })), item.hierarchy[item.type] && (item.type === 'lvl2' || item.type === 'lvl3' || item.type === 'lvl4' || item.type === 'lvl5' || item.type === 'lvl6') && /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Hit-content-wrapper"
  }, /*#__PURE__*/React.createElement(Snippet, {
    className: "DocSearch-Hit-title",
    hit: item,
    attribute: "hierarchy.".concat(item.type)
  }), /*#__PURE__*/React.createElement(Snippet, {
    className: "DocSearch-Hit-path",
    hit: item,
    attribute: "hierarchy.lvl1"
  })), item.type === 'content' && /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Hit-content-wrapper"
  }, /*#__PURE__*/React.createElement(Snippet, {
    className: "DocSearch-Hit-title",
    hit: item,
    attribute: "content"
  }), /*#__PURE__*/React.createElement(Snippet, {
    className: "DocSearch-Hit-path",
    hit: item,
    attribute: "hierarchy.lvl1"
  })), renderAction({
    item: item,
    runDeleteTransition: runDeleteTransition,
    runFavoriteTransition: runFavoriteTransition
  }))));
}