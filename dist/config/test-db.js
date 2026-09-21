"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("./database"));
const testConnection = async () => {
    try {
        const result = await database_1.default.query("SELECT NOW()");
        console.log("Database connected successfully!");
        console.log("Database time:", result.rows[0].now);
    }
    catch (error) {
        console.error("Database connection failed:", error.message);
    }
    finally {
        await database_1.default.end();
    }
};
testConnection();
