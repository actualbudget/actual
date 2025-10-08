"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankSyncErrorCode = void 0;
/**
 * Standardized error codes for bank sync plugins
 */
var BankSyncErrorCode;
(function (BankSyncErrorCode) {
    BankSyncErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    BankSyncErrorCode["INVALID_ACCESS_TOKEN"] = "INVALID_ACCESS_TOKEN";
    BankSyncErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    BankSyncErrorCode["ACCOUNT_NOT_FOUND"] = "ACCOUNT_NOT_FOUND";
    BankSyncErrorCode["TRANSACTION_NOT_FOUND"] = "TRANSACTION_NOT_FOUND";
    BankSyncErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    BankSyncErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    BankSyncErrorCode["RATE_LIMIT"] = "RATE_LIMIT";
    BankSyncErrorCode["INVALID_REQUEST"] = "INVALID_REQUEST";
    BankSyncErrorCode["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
    BankSyncErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(BankSyncErrorCode || (exports.BankSyncErrorCode = BankSyncErrorCode = {}));
