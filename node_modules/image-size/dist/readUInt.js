"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readUInt = void 0;
// Abstract reading multi-byte unsigned integers
function readUInt(buffer, bits, offset, isBigEndian) {
    offset = offset || 0;
    const endian = isBigEndian ? 'BE' : 'LE';
    const methodName = ('readUInt' + bits + endian);
    return buffer[methodName].call(buffer, offset);
}
exports.readUInt = readUInt;
