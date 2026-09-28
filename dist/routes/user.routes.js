"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const router = express_1.default.Router();
// First establish identity.
router.use(auth_1.authenticate);
// Then establish permission.
router.get("/", (0, authorize_1.requirePermission)("users:read"), user_controller_1.getUsers);
router.get("/:id", (0, authorize_1.requirePermission)("users:read"), user_controller_1.getUserById);
exports.default = router;
