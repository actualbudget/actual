"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncProtoBuf = exports.merkle = exports.Timestamp = exports.deserializeClock = exports.serializeClock = exports.makeClientId = exports.makeClock = exports.setClock = exports.getClock = void 0;
var crdt_1 = require("./crdt");
Object.defineProperty(exports, "getClock", { enumerable: true, get: function () { return crdt_1.getClock; } });
Object.defineProperty(exports, "setClock", { enumerable: true, get: function () { return crdt_1.setClock; } });
Object.defineProperty(exports, "makeClock", { enumerable: true, get: function () { return crdt_1.makeClock; } });
Object.defineProperty(exports, "makeClientId", { enumerable: true, get: function () { return crdt_1.makeClientId; } });
Object.defineProperty(exports, "serializeClock", { enumerable: true, get: function () { return crdt_1.serializeClock; } });
Object.defineProperty(exports, "deserializeClock", { enumerable: true, get: function () { return crdt_1.deserializeClock; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return crdt_1.Timestamp; } });
var crdt_2 = require("./crdt");
Object.defineProperty(exports, "merkle", { enumerable: true, get: function () { return crdt_2.merkle; } });
const SyncPb = __importStar(require("./proto/sync_pb"));
// export const timestamp = {
//   getClock,
//   setClock,
//   makeClock,
//   makeClientId,
//   serializeClock,
//   deserializeClock,
//   Timestamp,
// };
exports.SyncProtoBuf = SyncPb;
