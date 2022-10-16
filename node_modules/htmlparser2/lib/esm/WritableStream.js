import { Parser } from "./Parser.js";
/*
 * NOTE: If either of these two imports produces a type error,
 * please update your @types/node dependency!
 */
import { Writable } from "stream";
import { StringDecoder } from "string_decoder";
// Following the example in https://nodejs.org/api/stream.html#stream_decoding_buffers_in_a_writable_stream
function isBuffer(_chunk, encoding) {
    return encoding === "buffer";
}
/**
 * WritableStream makes the `Parser` interface available as a NodeJS stream.
 *
 * @see Parser
 */
export class WritableStream extends Writable {
    constructor(cbs, options) {
        super({ decodeStrings: false });
        this._decoder = new StringDecoder();
        this._parser = new Parser(cbs, options);
    }
    _write(chunk, encoding, cb) {
        this._parser.write(isBuffer(chunk, encoding) ? this._decoder.write(chunk) : chunk);
        cb();
    }
    _final(cb) {
        this._parser.end(this._decoder.end());
        cb();
    }
}
//# sourceMappingURL=WritableStream.js.map