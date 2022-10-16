"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GIF = void 0;
const gifRegexp = /^GIF8[79]a/;
exports.GIF = {
    validate(buffer) {
        const signature = buffer.toString('ascii', 0, 6);
        return (gifRegexp.test(signature));
    },
    calculate(buffer) {
        return {
            height: buffer.readUInt16LE(8),
            width: buffer.readUInt16LE(6)
        };
    }
};
