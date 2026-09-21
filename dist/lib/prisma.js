"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("../generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const env_1 = __importDefault(require("../config/env"));
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: env_1.default.DATABASE_URL,
});
exports.prisma = new client_1.PrismaClient({
    adapter,
    log: env_1.default.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
});
