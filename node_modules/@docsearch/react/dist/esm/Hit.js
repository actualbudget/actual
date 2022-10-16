import React from 'react';
export function Hit(_ref) {
  var hit = _ref.hit,
      children = _ref.children;
  return /*#__PURE__*/React.createElement("a", {
    href: hit.url
  }, children);
}