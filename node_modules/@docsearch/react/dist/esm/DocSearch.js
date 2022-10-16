function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

import React from 'react';
import { createPortal } from 'react-dom';
import { DocSearchButton } from './DocSearchButton';
import { DocSearchModal } from './DocSearchModal';
import { useDocSearchKeyboardEvents } from './useDocSearchKeyboardEvents';
export function DocSearch(props) {
  var _props$translations, _props$translations2;

  var searchButtonRef = React.useRef(null);

  var _React$useState = React.useState(false),
      _React$useState2 = _slicedToArray(_React$useState, 2),
      isOpen = _React$useState2[0],
      setIsOpen = _React$useState2[1];

  var _React$useState3 = React.useState((props === null || props === void 0 ? void 0 : props.initialQuery) || undefined),
      _React$useState4 = _slicedToArray(_React$useState3, 2),
      initialQuery = _React$useState4[0],
      setInitialQuery = _React$useState4[1];

  var onOpen = React.useCallback(function () {
    setIsOpen(true);
  }, [setIsOpen]);
  var onClose = React.useCallback(function () {
    setIsOpen(false);
  }, [setIsOpen]);
  var onInput = React.useCallback(function (event) {
    setIsOpen(true);
    setInitialQuery(event.key);
  }, [setIsOpen, setInitialQuery]);
  useDocSearchKeyboardEvents({
    isOpen: isOpen,
    onOpen: onOpen,
    onClose: onClose,
    onInput: onInput,
    searchButtonRef: searchButtonRef
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DocSearchButton, {
    ref: searchButtonRef,
    translations: props === null || props === void 0 ? void 0 : (_props$translations = props.translations) === null || _props$translations === void 0 ? void 0 : _props$translations.button,
    onClick: onOpen
  }), isOpen && createPortal( /*#__PURE__*/React.createElement(DocSearchModal, _extends({}, props, {
    initialScrollY: window.scrollY,
    initialQuery: initialQuery,
    translations: props === null || props === void 0 ? void 0 : (_props$translations2 = props.translations) === null || _props$translations2 === void 0 ? void 0 : _props$translations2.modal,
    onClose: onClose
  })), document.body));
}