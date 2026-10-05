"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = __importDefault(require("./config/env"));
const logger_1 = require("./lib/logger");
app_1.default.listen(env_1.default.PORT, () => {
    logger_1.logger.info(`Server running`, { port: env_1.default.PORT, env: env_1.default.NODE_ENV });
});
