"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KTX = void 0;
const SIGNATURE = 'KTX 11';
exports.KTX = {
    validate(buffer) {
        return SIGNATURE === buffer.toString('ascii', 1, 7);
    },
    calculate(buffer) {
        return {
            height: buffer.readUInt32LE(40),
            width: buffer.readUInt32LE(36),
        };
    }
};
