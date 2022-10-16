/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type SluggerOptions } from './slugger';
/**
 * Parses custom ID from a heading. The ID can contain any characters except
 * `{#` and `}`.
 *
 * @param heading e.g. `## Some heading {#some-heading}` where the last
 * character must be `}` for the ID to be recognized
 */
export declare function parseMarkdownHeadingId(heading: string): {
    /**
     * The heading content sans the ID part, right-trimmed. e.g. `## Some heading`
     */
    text: string;
    /** The heading ID. e.g. `some-heading` */
    id: string | undefined;
};
/**
 * Creates an excerpt of a Markdown file. This function will:
 *
 * - Ignore h1 headings (setext or atx)
 * - Ignore import/export
 * - Ignore code blocks
 *
 * And for the first contentful line, it will strip away most Markdown
 * syntax, including HTML tags, emphasis, links (keeping the text), etc.
 */
export declare function createExcerpt(fileString: string): string | undefined;
/**
 * Takes a raw Markdown file content, and parses the front matter using
 * gray-matter. Worth noting that gray-matter accepts TOML and other markup
 * languages as well.
 *
 * @throws Throws when gray-matter throws. e.g.:
 * ```md
 * ---
 * foo: : bar
 * ---
 * ```
 */
export declare function parseFrontMatter(markdownFileContent: string): {
    /** Front matter as parsed by gray-matter. */
    frontMatter: {
        [key: string]: unknown;
    };
    /** The remaining content, trimmed. */
    content: string;
};
declare type ParseMarkdownContentTitleOptions = {
    /**
     * If `true`, the matching title will be removed from the returned content.
     * We can promise that at least one empty line will be left between the
     * content before and after, but you shouldn't make too much assumption
     * about what's left.
     */
    removeContentTitle?: boolean;
};
/**
 * Takes the raw Markdown content, without front matter, and tries to find an h1
 * title (setext or atx) to be used as metadata.
 *
 * It only searches until the first contentful paragraph, ignoring import/export
 * declarations.
 *
 * It will try to convert markdown to reasonable text, but won't be best effort,
 * since it's only used as a fallback when `frontMatter.title` is not provided.
 * For now, we just unwrap inline code (``# `config.js` `` => `config.js`).
 */
export declare function parseMarkdownContentTitle(contentUntrimmed: string, options?: ParseMarkdownContentTitleOptions): {
    /** The content, optionally without the content title. */
    content: string;
    /** The title, trimmed and without the `#`. */
    contentTitle: string | undefined;
};
/**
 * Makes a full-round parse.
 *
 * @throws Throws when `parseFrontMatter` throws, usually because of invalid
 * syntax.
 */
export declare function parseMarkdownString(markdownFileContent: string, options?: ParseMarkdownContentTitleOptions): {
    /** @see {@link parseFrontMatter} */
    frontMatter: {
        [key: string]: unknown;
    };
    /** @see {@link parseMarkdownContentTitle} */
    contentTitle: string | undefined;
    /** @see {@link createExcerpt} */
    excerpt: string | undefined;
    /**
     * Content without front matter and (optionally) without title, depending on
     * the `removeContentTitle` option.
     */
    content: string;
};
export declare type WriteHeadingIDOptions = SluggerOptions & {
    /** Overwrite existing heading IDs. */
    overwrite?: boolean;
};
/**
 * Takes Markdown content, returns new content with heading IDs written.
 * Respects existing IDs (unless `overwrite=true`) and never generates colliding
 * IDs (through the slugger).
 */
export declare function writeMarkdownHeadingId(content: string, options?: WriteHeadingIDOptions): string;
export {};
//# sourceMappingURL=markdownUtils.d.ts.map