"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const correlationId_1 = __importDefault(require("./middleware/correlationId"));
const logger_1 = __importDefault(require("./middleware/logger"));
const errorHandler_1 = require("./middleware/errorHandler");
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const conversation_routes_1 = __importDefault(require("./routes/conversation.routes"));
require("./events/auth.events");
require("./events/document.events");
require("./events/admin.events");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(correlationId_1.default);
app.use(logger_1.default);
app.use("/api/v1/auth", auth_1.default);
/*
 * Interactive API documentation.
 *
 * Visit:
 * http://localhost:3000/api-docs
 */
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
/*
 * Raw OpenAPI JSON.
 *
 * Useful for tools that consume OpenAPI directly.
 */
app.get("/api-docs.json", (req, res) => {
    res.json(swagger_1.swaggerSpec);
});
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is healthy",
    });
});
app.use("/api/v1/users", user_routes_1.default);
app.use("/api/v1/admin", admin_1.default);
app.use("/api/v1/documents", document_routes_1.default);
app.use("/api/v1/conversations", conversation_routes_1.default);
// ============================================================
// 404 HANDLER
// ============================================================
//
// If Express reaches this point, none of our routes matched.
// ============================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: "NOT_FOUND",
            message: `Route ${req.path} not found`,
        },
    });
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
