/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { CSSProperties } from 'react';
import type { PrismTheme } from 'prism-react-renderer';
export declare type MagicCommentConfig = {
    className: string;
    line?: string;
    block?: {
        start: string;
        end: string;
    };
};
export declare function parseCodeBlockTitle(metastring?: string): string;
export declare function containsLineNumbers(metastring?: string): boolean;
/**
 * Gets the language name from the class name (set by MDX).
 * e.g. `"language-javascript"` => `"javascript"`.
 * Returns undefined if there is no language class name.
 */
export declare function parseLanguage(className: string): string | undefined;
/**
 * Parses the code content, strips away any magic comments, and returns the
 * clean content and the highlighted lines marked by the comments or metastring.
 *
 * If the metastring contains a range, the `content` will be returned as-is
 * without any parsing. The returned `lineClassNames` will be a map from that
 * number range to the first magic comment config entry (which _should_ be for
 * line highlight directives.)
 *
 * @param content The raw code with magic comments. Trailing newline will be
 * trimmed upfront.
 * @param options Options for parsing behavior.
 */
export declare function parseLines(content: string, options: {
    /**
     * The full metastring, as received from MDX. Line ranges declared here
     * start at 1.
     */
    metastring: string | undefined;
    /**
     * Language of the code block, used to determine which kinds of magic
     * comment styles to enable.
     */
    language: string | undefined;
    /**
     * Magic comment types that we should try to parse. Each entry would
     * correspond to one class name to apply to each line.
     */
    magicComments: MagicCommentConfig[];
}): {
    /**
     * The highlighted lines, 0-indexed. e.g. `{ 0: ["highlight", "sample"] }`
     * means the 1st line should have `highlight` and `sample` as class names.
     */
    lineClassNames: {
        [lineIndex: number]: string[];
    };
    /**
     * If there's number range declared in the metastring, the code block is
     * returned as-is (no parsing); otherwise, this is the clean code with all
     * magic comments stripped away.
     */
    code: string;
};
export declare function getPrismCssVariables(prismTheme: PrismTheme): CSSProperties;
//# sourceMappingURL=codeBlockUtils.d.ts.map