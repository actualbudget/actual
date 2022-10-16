var _excluded = ["translations"];

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

import React from 'react';
import { RecentIcon, ResetIcon, StarIcon } from './icons';
import { Results } from './Results';
export function StartScreen(_ref) {
  var _ref$translations = _ref.translations,
      translations = _ref$translations === void 0 ? {} : _ref$translations,
      props = _objectWithoutProperties(_ref, _excluded);

  var _translations$recentS = translations.recentSearchesTitle,
      recentSearchesTitle = _translations$recentS === void 0 ? 'Recent' : _translations$recentS,
      _translations$noRecen = translations.noRecentSearchesText,
      noRecentSearchesText = _translations$noRecen === void 0 ? 'No recent searches' : _translations$noRecen,
      _translations$saveRec = translations.saveRecentSearchButtonTitle,
      saveRecentSearchButtonTitle = _translations$saveRec === void 0 ? 'Save this search' : _translations$saveRec,
      _translations$removeR = translations.removeRecentSearchButtonTitle,
      removeRecentSearchButtonTitle = _translations$removeR === void 0 ? 'Remove this search from history' : _translations$removeR,
      _translations$favorit = translations.favoriteSearchesTitle,
      favoriteSearchesTitle = _translations$favorit === void 0 ? 'Favorite' : _translations$favorit,
      _translations$removeF = translations.removeFavoriteSearchButtonTitle,
      removeFavoriteSearchButtonTitle = _translations$removeF === void 0 ? 'Remove this search from favorites' : _translations$removeF;

  if (props.state.status === 'idle' && props.hasCollections === false) {
    if (props.disableUserPersonalization) {
      return null;
    }

    return /*#__PURE__*/React.createElement("div", {
      className: "DocSearch-StartScreen"
    }, /*#__PURE__*/React.createElement("p", {
      className: "DocSearch-Help"
    }, noRecentSearchesText));
  }

  if (props.hasCollections === false) {
    return null;
  }

  return /*#__PURE__*/React.createElement("div", {
    className: "DocSearch-Dropdown-Container"
  }, /*#__PURE__*/React.createElement(Results, _extends({}, props, {
    title: recentSearchesTitle,
    collection: props.state.collections[0],
    renderIcon: function renderIcon() {
      return /*#__PURE__*/React.createElement("div", {
        className: "DocSearch-Hit-icon"
      }, /*#__PURE__*/React.createElement(RecentIcon, null));
    },
    renderAction: function renderAction(_ref2) {
      var item = _ref2.item,
          runFavoriteTransition = _ref2.runFavoriteTransition,
          runDeleteTransition = _ref2.runDeleteTransition;
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "DocSearch-Hit-action"
      }, /*#__PURE__*/React.createElement("button", {
        className: "DocSearch-Hit-action-button",
        title: saveRecentSearchButtonTitle,
        type: "submit",
        onClick: function onClick(event) {
          event.preventDefault();
          event.stopPropagation();
          runFavoriteTransition(function () {
            props.favoriteSearches.add(item);
            props.recentSearches.remove(item);
            props.refresh();
          });
        }
      }, /*#__PURE__*/React.createElement(StarIcon, null))), /*#__PURE__*/React.createElement("div", {
        className: "DocSearch-Hit-action"
      }, /*#__PURE__*/React.createElement("button", {
        className: "DocSearch-Hit-action-button",
        title: removeRecentSearchButtonTitle,
        type: "submit",
        onClick: function onClick(event) {
          event.preventDefault();
          event.stopPropagation();
          runDeleteTransition(function () {
            props.recentSearches.remove(item);
            props.refresh();
          });
        }
      }, /*#__PURE__*/React.createElement(ResetIcon, null))));
    }
  })), /*#__PURE__*/React.createElement(Results, _extends({}, props, {
    title: favoriteSearchesTitle,
    collection: props.state.collections[1],
    renderIcon: function renderIcon() {
      return /*#__PURE__*/React.createElement("div", {
        className: "DocSearch-Hit-icon"
      }, /*#__PURE__*/React.createElement(StarIcon, null));
    },
    renderAction: function renderAction(_ref3) {
      var item = _ref3.item,
          runDeleteTransition = _ref3.runDeleteTransition;
      return /*#__PURE__*/React.createElement("div", {
        className: "DocSearch-Hit-action"
      }, /*#__PURE__*/React.createElement("button", {
        className: "DocSearch-Hit-action-button",
        title: removeFavoriteSearchButtonTitle,
        type: "submit",
        onClick: function onClick(event) {
          event.preventDefault();
          event.stopPropagation();
          runDeleteTransition(function () {
            props.favoriteSearches.remove(item);
            props.refresh();
          });
        }
      }, /*#__PURE__*/React.createElement(ResetIcon, null)));
    }
  })));
}