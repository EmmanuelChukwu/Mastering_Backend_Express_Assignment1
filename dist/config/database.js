"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const env_1 = __importDefault(require("./env"));
const pool = new pg_1.Pool({
    host: env_1.default.DB_HOST,
    port: env_1.default.DB_PORT,
    database: env_1.default.DB_NAME,
    user: env_1.default.DB_USER,
    password: env_1.default.DB_PASSWORD,
});
exports.default = pool;
