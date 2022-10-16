import { Parser } from "./Parser.js";
export { Parser };
import { DomHandler, } from "domhandler";
export { DomHandler };
// Helper methods
/**
 * Parses the data, returns the resulting document.
 *
 * @param data The data that should be parsed.
 * @param options Optional options for the parser and DOM builder.
 */
export function parseDocument(data, options) {
    const handler = new DomHandler(undefined, options);
    new Parser(handler, options).end(data);
    return handler.root;
}
/**
 * Parses data, returns an array of the root nodes.
 *
 * Note that the root nodes still have a `Document` node as their parent.
 * Use `parseDocument` to get the `Document` node instead.
 *
 * @param data The data that should be parsed.
 * @param options Optional options for the parser and DOM builder.
 * @deprecated Use `parseDocument` instead.
 */
export function parseDOM(data, options) {
    return parseDocument(data, options).children;
}
/**
 * Creates a parser instance, with an attached DOM handler.
 *
 * @param cb A callback that will be called once parsing has been completed.
 * @param options Optional options for the parser and DOM builder.
 * @param elementCb An optional callback that will be called every time a tag has been completed inside of the DOM.
 */
export function createDomStream(cb, options, elementCb) {
    const handler = new DomHandler(cb, options, elementCb);
    return new Parser(handler, options);
}
export { default as Tokenizer, } from "./Tokenizer.js";
/*
 * All of the following exports exist for backwards-compatibility.
 * They should probably be removed eventually.
 */
import * as ElementType from "domelementtype";
export { ElementType };
import { getFeed } from "domutils";
export { getFeed };
/**
 * Parse a feed.
 *
 * @param feed The feed that should be parsed, as a string.
 * @param options Optionally, options for parsing. When using this, you should set `xmlMode` to `true`.
 */
export function parseFeed(feed, options = { xmlMode: true }) {
    return getFeed(parseDOM(feed, options));
}
export * as DomUtils from "domutils";
// Old name for DomHandler
export { DomHandler as DefaultHandler };
//# sourceMappingURL=index.js.map