"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const correlationId_1 = __importDefault(require("./middleware/correlationId"));
const logger_1 = __importDefault(require("./middleware/logger"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_1 = __importDefault(require("./routes/auth"));
require("./events/auth.events");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api/auth", auth_1.default);
app.use(correlationId_1.default);
app.use(logger_1.default);
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is healthy",
    });
});
app.use("/api/users", user_routes_1.default);
app.use(errorHandler_1.default);
exports.default = app;
