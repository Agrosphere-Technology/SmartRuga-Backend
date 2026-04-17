"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function successResponse({ message = "Success", data = null, meta = null, }) {
    return {
        success: true,
        message,
        data,
        ...(meta ? { meta } : {}),
    };
}
function errorResponse({ message = "Something went wrong", errors = null, }) {
    return {
        success: false,
        message,
        ...(errors ? { errors } : {}),
    };
}
