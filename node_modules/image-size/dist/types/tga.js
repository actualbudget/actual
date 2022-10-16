"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TGA = void 0;
exports.TGA = {
    validate(buffer) {
        return buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(4) === 0;
    },
    calculate(buffer) {
        return {
            height: buffer.readUInt16LE(14),
            width: buffer.readUInt16LE(12),
        };
    }
};
