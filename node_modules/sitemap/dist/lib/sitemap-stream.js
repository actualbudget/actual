"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamToPromise = exports.SitemapStream = exports.closetag = exports.stylesheetInclude = void 0;
const stream_1 = require("stream");
const types_1 = require("./types");
const utils_1 = require("./utils");
const sitemap_item_stream_1 = require("./sitemap-item-stream");
const errors_1 = require("./errors");
const xmlDec = '<?xml version="1.0" encoding="UTF-8"?>';
const stylesheetInclude = (url) => {
    return `<?xml-stylesheet type="text/xsl" href="${url}"?>`;
};
exports.stylesheetInclude = stylesheetInclude;
const urlsetTagStart = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const getURLSetNs = ({ news, video, image, xhtml, custom }, xslURL) => {
    let ns = xmlDec;
    if (xslURL) {
        ns += (0, exports.stylesheetInclude)(xslURL);
    }
    ns += urlsetTagStart;
    if (news) {
        ns += ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
    }
    if (xhtml) {
        ns += ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
    }
    if (image) {
        ns += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    }
    if (video) {
        ns += ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
    }
    if (custom) {
        ns += ' ' + custom.join(' ');
    }
    return ns + '>';
};
exports.closetag = '</urlset>';
const defaultXMLNS = {
    news: true,
    xhtml: true,
    image: true,
    video: true,
};
const defaultStreamOpts = {
    xmlns: defaultXMLNS,
};
/**
 * A [Transform](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream)
 * for turning a
 * [Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams)
 * of either [SitemapItemOptions](#sitemap-item-options) or url strings into a
 * Sitemap. The readable stream it transforms **must** be in object mode.
 */
class SitemapStream extends stream_1.Transform {
    constructor(opts = defaultStreamOpts) {
        opts.objectMode = true;
        super(opts);
        this.hasHeadOutput = false;
        this.hostname = opts.hostname;
        this.level = opts.level || types_1.ErrorLevel.WARN;
        this.errorHandler = opts.errorHandler;
        this.smiStream = new sitemap_item_stream_1.SitemapItemStream({ level: opts.level });
        this.smiStream.on('data', (data) => this.push(data));
        this.lastmodDateOnly = opts.lastmodDateOnly || false;
        this.xmlNS = opts.xmlns || defaultXMLNS;
        this.xslUrl = opts.xslUrl;
    }
    _transform(item, encoding, callback) {
        if (!this.hasHeadOutput) {
            this.hasHeadOutput = true;
            this.push(getURLSetNs(this.xmlNS, this.xslUrl));
        }
        this.smiStream.write((0, utils_1.validateSMIOptions)((0, utils_1.normalizeURL)(item, this.hostname, this.lastmodDateOnly), this.level, this.errorHandler));
        callback();
    }
    _flush(cb) {
        if (!this.hasHeadOutput) {
            cb(new errors_1.EmptySitemap());
        }
        else {
            this.push(exports.closetag);
            cb();
        }
    }
}
exports.SitemapStream = SitemapStream;
/**
 * Takes a stream returns a promise that resolves when stream emits finish
 * @param stream what you want wrapped in a promise
 */
function streamToPromise(stream) {
    return new Promise((resolve, reject) => {
        const drain = [];
        stream
            .pipe(new stream_1.Writable({
            write(chunk, enc, next) {
                drain.push(chunk);
                next();
            },
        }))
            .on('error', reject)
            .on('finish', () => {
            if (!drain.length) {
                reject(new errors_1.EmptyStream());
            }
            else {
                resolve(Buffer.concat(drain));
            }
        });
    });
}
exports.streamToPromise = streamToPromise;
