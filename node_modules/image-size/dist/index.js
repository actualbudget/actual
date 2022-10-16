"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.types = exports.setConcurrency = exports.disableTypes = exports.disableFS = exports.imageSize = void 0;
const fs = require("fs");
const path = require("path");
const queue_1 = require("queue");
const types_1 = require("./types");
const detector_1 = require("./detector");
// Maximum buffer size, with a default of 512 kilobytes.
// TO-DO: make this adaptive based on the initial signature of the image
const MaxBufferSize = 512 * 1024;
// This queue is for async `fs` operations, to avoid reaching file-descriptor limits
const queue = new queue_1.default({ concurrency: 100, autostart: true });
const globalOptions = {
    disabledFS: false,
    disabledTypes: []
};
/**
 * Return size information based on a buffer
 *
 * @param {Buffer} buffer
 * @param {String} filepath
 * @returns {Object}
 */
function lookup(buffer, filepath) {
    // detect the file type.. don't rely on the extension
    const type = (0, detector_1.detector)(buffer);
    if (typeof type !== 'undefined') {
        if (globalOptions.disabledTypes.indexOf(type) > -1) {
            throw new TypeError('disabled file type: ' + type);
        }
        // find an appropriate handler for this file type
        if (type in types_1.typeHandlers) {
            const size = types_1.typeHandlers[type].calculate(buffer, filepath);
            if (size !== undefined) {
                size.type = type;
                return size;
            }
        }
    }
    // throw up, if we don't understand the file
    throw new TypeError('unsupported file type: ' + type + ' (file: ' + filepath + ')');
}
/**
 * Reads a file into a buffer.
 * @param {String} filepath
 * @returns {Promise<Buffer>}
 */
async function asyncFileToBuffer(filepath) {
    const handle = await fs.promises.open(filepath, 'r');
    try {
        const { size } = await handle.stat();
        if (size <= 0) {
            throw new Error('Empty file');
        }
        const bufferSize = Math.min(size, MaxBufferSize);
        const buffer = Buffer.alloc(bufferSize);
        await handle.read(buffer, 0, bufferSize, 0);
        return buffer;
    }
    finally {
        await handle.close();
    }
}
/**
 * Synchronously reads a file into a buffer, blocking the nodejs process.
 *
 * @param {String} filepath
 * @returns {Buffer}
 */
function syncFileToBuffer(filepath) {
    // read from the file, synchronously
    const descriptor = fs.openSync(filepath, 'r');
    try {
        const { size } = fs.fstatSync(descriptor);
        if (size <= 0) {
            throw new Error('Empty file');
        }
        const bufferSize = Math.min(size, MaxBufferSize);
        const buffer = Buffer.alloc(bufferSize);
        fs.readSync(descriptor, buffer, 0, bufferSize, 0);
        return buffer;
    }
    finally {
        fs.closeSync(descriptor);
    }
}
// eslint-disable-next-line @typescript-eslint/no-use-before-define
module.exports = exports = imageSize; // backwards compatibility
exports.default = imageSize;
/**
 * @param {Buffer|string} input - buffer or relative/absolute path of the image file
 * @param {Function=} [callback] - optional function for async detection
 */
function imageSize(input, callback) {
    // Handle buffer input
    if (Buffer.isBuffer(input)) {
        return lookup(input);
    }
    // input should be a string at this point
    if (typeof input !== 'string' || globalOptions.disabledFS) {
        throw new TypeError('invalid invocation. input should be a Buffer');
    }
    // resolve the file path
    const filepath = path.resolve(input);
    if (typeof callback === 'function') {
        queue.push(() => asyncFileToBuffer(filepath)
            .then((buffer) => process.nextTick(callback, null, lookup(buffer, filepath)))
            .catch(callback));
    }
    else {
        const buffer = syncFileToBuffer(filepath);
        return lookup(buffer, filepath);
    }
}
exports.imageSize = imageSize;
const disableFS = (v) => { globalOptions.disabledFS = v; };
exports.disableFS = disableFS;
const disableTypes = (types) => { globalOptions.disabledTypes = types; };
exports.disableTypes = disableTypes;
const setConcurrency = (c) => { queue.concurrency = c; };
exports.setConcurrency = setConcurrency;
exports.types = Object.keys(types_1.typeHandlers);
