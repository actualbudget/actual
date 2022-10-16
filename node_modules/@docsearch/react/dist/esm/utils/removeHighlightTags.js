var regexHighlightTags = /(<mark>|<\/mark>)/g;
var regexHasHighlightTags = RegExp(regexHighlightTags.source);
export function removeHighlightTags(hit) {
  var _internalDocSearchHit, _internalDocSearchHit2, _internalDocSearchHit3, _hit$_highlightResult, _hit$_highlightResult2;

  var internalDocSearchHit = hit;

  if (!internalDocSearchHit.__docsearch_parent && !hit._highlightResult) {
    return hit.hierarchy.lvl0;
  }

  var _ref = (internalDocSearchHit.__docsearch_parent ? (_internalDocSearchHit = internalDocSearchHit.__docsearch_parent) === null || _internalDocSearchHit === void 0 ? void 0 : (_internalDocSearchHit2 = _internalDocSearchHit._highlightResult) === null || _internalDocSearchHit2 === void 0 ? void 0 : (_internalDocSearchHit3 = _internalDocSearchHit2.hierarchy) === null || _internalDocSearchHit3 === void 0 ? void 0 : _internalDocSearchHit3.lvl0 : (_hit$_highlightResult = hit._highlightResult) === null || _hit$_highlightResult === void 0 ? void 0 : (_hit$_highlightResult2 = _hit$_highlightResult.hierarchy) === null || _hit$_highlightResult2 === void 0 ? void 0 : _hit$_highlightResult2.lvl0) || {},
      value = _ref.value;

  return value && regexHasHighlightTags.test(value) ? value.replace(regexHighlightTags, '') : value;
}