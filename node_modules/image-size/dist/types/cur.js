"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUR = void 0;
const ico_1 = require("./ico");
const TYPE_CURSOR = 2;
exports.CUR = {
    validate(buffer) {
        const reserved = buffer.readUInt16LE(0);
        const imageCount = buffer.readUInt16LE(4);
        if (reserved !== 0 || imageCount === 0) {
            return false;
        }
        const imageType = buffer.readUInt16LE(2);
        return imageType === TYPE_CURSOR;
    },
    calculate(buffer) {
        return ico_1.ICO.calculate(buffer);
    }
};
