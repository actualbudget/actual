/// <reference types="node" />
import { Transform, TransformOptions, TransformCallback, Readable } from 'stream';
import { SitemapItemLoose, ErrorLevel, ErrorHandler } from './types';
export declare const stylesheetInclude: (url: string) => string;
export interface NSArgs {
    news: boolean;
    video: boolean;
    xhtml: boolean;
    image: boolean;
    custom?: string[];
}
export declare const closetag = "</urlset>";
export interface SitemapStreamOptions extends TransformOptions {
    hostname?: string;
    level?: ErrorLevel;
    lastmodDateOnly?: boolean;
    xmlns?: NSArgs;
    xslUrl?: string;
    errorHandler?: ErrorHandler;
}
/**
 * A [Transform](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream)
 * for turning a
 * [Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams)
 * of either [SitemapItemOptions](#sitemap-item-options) or url strings into a
 * Sitemap. The readable stream it transforms **must** be in object mode.
 */
export declare class SitemapStream extends Transform {
    hostname?: string;
    level: ErrorLevel;
    hasHeadOutput: boolean;
    xmlNS: NSArgs;
    xslUrl?: string;
    errorHandler?: ErrorHandler;
    private smiStream;
    lastmodDateOnly: boolean;
    constructor(opts?: SitemapStreamOptions);
    _transform(item: SitemapItemLoose, encoding: string, callback: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
/**
 * Takes a stream returns a promise that resolves when stream emits finish
 * @param stream what you want wrapped in a promise
 */
export declare function streamToPromise(stream: Readable): Promise<Buffer>;
