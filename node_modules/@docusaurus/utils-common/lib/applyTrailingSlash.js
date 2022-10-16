"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Trailing slash handling depends in some site configuration options
function applyTrailingSlash(path, options) {
    const { trailingSlash, baseUrl } = options;
    if (path.startsWith('#')) {
        // Never apply trailing slash to an anchor link
        return path;
    }
    // TODO deduplicate: also present in @docusaurus/utils
    function addTrailingSlash(str) {
        return str.endsWith('/') ? str : `${str}/`;
    }
    function removeTrailingSlash(str) {
        return str.endsWith('/') ? str.slice(0, -1) : str;
    }
    function handleTrailingSlash(str, trailing) {
        return trailing ? addTrailingSlash(str) : removeTrailingSlash(str);
    }
    // undefined = legacy retrocompatible behavior
    if (typeof trailingSlash === 'undefined') {
        return path;
    }
    // The trailing slash should be handled before the ?search#hash !
    const [pathname] = path.split(/[#?]/);
    // Never transform '/' to ''
    // Never remove the baseUrl trailing slash!
    // If baseUrl = /myBase/, we want to emit /myBase/index.html and not
    // /myBase.html! See https://github.com/facebook/docusaurus/issues/5077
    const shouldNotApply = pathname === '/' || pathname === baseUrl;
    const newPathname = shouldNotApply
        ? pathname
        : handleTrailingSlash(pathname, trailingSlash);
    return path.replace(pathname, newPathname);
}
exports.default = applyTrailingSlash;
//# sourceMappingURL=applyTrailingSlash.js.map