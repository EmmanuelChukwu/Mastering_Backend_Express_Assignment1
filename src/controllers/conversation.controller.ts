import { Request, Response } from "express";

import {
  createConversation,
  listConversations,
  sendMessage,
} from "../services/conversation.service";

import { UnauthorizedError } from "../lib/errors";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

function getUserId(req: AuthenticatedRequest): string {
  if (!req.user?.id) {
    throw new UnauthorizedError();
  }

  return req.user.id;
}

/*
 * ============================================================
 * POST /conversations
 * ============================================================
 */
export async function createConversationController(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = getUserId(req);

  const conversation = await createConversation(
    userId,
    req.body.title
  );

  res.status(201).json({
    success: true,
    data: conversation,
  });
}

/*
 * ============================================================
 * GET /conversations
 * ============================================================
 */
export async function getConversations(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = getUserId(req);

  const result = await listConversations(
    userId,
    req.query as unknown as {
      page: number;
      limit: number;
    }
  );

  res.status(200).json({
    success: true,
    ...result,
  });
}

/*
 * ============================================================
 * POST /conversations/:id/messages
 * ============================================================
 */
export async function createMessage(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = getUserId(req);

  const result = await sendMessage({
    conversationId: req.params.id,
    userId,
    content: req.body.content,
    documentId: req.body.documentId,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}