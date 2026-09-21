"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().int().positive(),
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]),
    DATABASE_URL: zod_1.z.string().min(1),
});
const env = envSchema.parse(process.env);
exports.default = env;
