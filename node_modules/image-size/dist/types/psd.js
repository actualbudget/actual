"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PSD = void 0;
exports.PSD = {
    validate(buffer) {
        return ('8BPS' === buffer.toString('ascii', 0, 4));
    },
    calculate(buffer) {
        return {
            height: buffer.readUInt32BE(14),
            width: buffer.readUInt32BE(18)
        };
    }
};
