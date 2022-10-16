import htmlDecodeTree from "./generated/decode-data-html.js";
import xmlDecodeTree from "./generated/decode-data-xml.js";
import decodeCodePoint from "./decode_codepoint.js";
export { htmlDecodeTree, xmlDecodeTree, decodeCodePoint };
export { replaceCodePoint, fromCodePoint } from "./decode_codepoint.js";
export declare enum BinTrieFlags {
    VALUE_LENGTH = 49152,
    BRANCH_LENGTH = 16256,
    JUMP_TABLE = 127
}
export declare function determineBranch(decodeTree: Uint16Array, current: number, nodeIdx: number, char: number): number;
/**
 * Decodes an HTML string, allowing for entities not terminated by a semi-colon.
 *
 * @param str The string to decode.
 * @returns The decoded string.
 */
export declare function decodeHTML(str: string): string;
/**
 * Decodes an HTML string, requiring all entities to be terminated by a semi-colon.
 *
 * @param str The string to decode.
 * @returns The decoded string.
 */
export declare function decodeHTMLStrict(str: string): string;
/**
 * Decodes an XML string, requiring all entities to be terminated by a semi-colon.
 *
 * @param str The string to decode.
 * @returns The decoded string.
 */
export declare function decodeXML(str: string): string;
//# sourceMappingURL=decode.d.ts.map