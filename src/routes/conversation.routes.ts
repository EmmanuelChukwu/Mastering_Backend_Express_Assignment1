import express from "express";

import {
  createConversationController,
  createMessage,
  getConversations,
} from "../controllers/conversation.controller";

import { validate } from "../middleware/validate";

import {
  createConversationSchema,
  listConversationsSchema,
  sendMessageSchema,
} from "../validators/conversation.validator";

import { authenticate } from "../middleware/auth";

const router = express.Router();

/*
 * Every conversation operation requires an authenticated user.
 */
router.use(authenticate);

/*
 * POST /api/v1/conversations
 */
router.post(
  "/",
  validate(createConversationSchema),
  createConversationController
);

/*
 * GET /api/v1/conversations
 */
router.get(
  "/",
  validate(listConversationsSchema),
  getConversations
);

/*
 * POST /api/v1/conversations/:id/messages
 */
router.post(
  "/:id/messages",
  validate(sendMessageSchema),
  createMessage
);

export default router;