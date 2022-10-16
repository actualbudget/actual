/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useMemo, useContext } from 'react';
import { ReactContextError } from '../utils/reactUtils';
const Context = React.createContext(null);
/**
 * Note: we don't use `PropBlogPostContent` as context value on purpose. Metadata is
 * currently stored inside the MDX component, but we may want to change that in
 * the future.
 */
function useContextValue({ content, isBlogPostPage, }) {
    return useMemo(() => ({
        metadata: content.metadata,
        frontMatter: content.frontMatter,
        assets: content.assets,
        toc: content.toc,
        isBlogPostPage,
    }), [content, isBlogPostPage]);
}
/**
 * This is a very thin layer around the `content` received from the MDX loader.
 * It provides metadata about the blog post to the children tree.
 */
export function BlogPostProvider({ children, content, isBlogPostPage = false, }) {
    const contextValue = useContextValue({ content, isBlogPostPage });
    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}
/**
 * Returns the data of the currently browsed blog post. Gives access to
 * front matter, metadata, TOC, etc.
 * When swizzling a low-level component (e.g. the "Edit this page" link)
 * and you need some extra metadata, you don't have to drill the props
 * all the way through the component tree: simply use this hook instead.
 */
export function useBlogPost() {
    const blogPost = useContext(Context);
    if (blogPost === null) {
        throw new ReactContextError('BlogPostProvider');
    }
    return blogPost;
}
//# sourceMappingURL=blogPost.js.map