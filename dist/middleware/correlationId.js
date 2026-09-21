"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const correlationId = (req, res, next) => {
    const id = req.headers["x-correlation-id"] || crypto_1.default.randomUUID();
    req.correlationId = id;
    res.setHeader("x-correlation-id", id);
    next();
};
exports.default = correlationId;
