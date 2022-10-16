"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BMP = void 0;
exports.BMP = {
    validate(buffer) {
        return ('BM' === buffer.toString('ascii', 0, 2));
    },
    calculate(buffer) {
        return {
            height: Math.abs(buffer.readInt32LE(22)),
            width: buffer.readUInt32LE(18)
        };
    }
};
