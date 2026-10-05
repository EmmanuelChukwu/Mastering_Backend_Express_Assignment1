import { Request, Response } from "express";

import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
} from "../services/document.service";
import { UnauthorizedError } from "../lib/errors";

/*
 * Express's Request type doesn't automatically know about
 * req.user unless we've extended it globally elsewhere.
 *
 * This local helper lets this controller safely access the
 * authenticated user ID.
 */
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
 * GET /documents
 * ============================================================
 */
export async function getDocuments(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);

  const result = await listDocuments(
    userId,
    req.query as unknown as {
      page: number;
      limit: number;
      status?: "pending" | "processing" | "ready" | "failed";
      search?: string;
      sortBy?: "createdAt" | "title" | "chunkCount";
      sortOrder?: "asc" | "desc";
    },
  );

  res.status(200).json({
    success: true,
    ...result,
  });
}

/*
 * ============================================================
 * GET /documents/:id
 * ============================================================
 */
export async function getDocumentById(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = getUserId(req);

  const document = await getDocument(req.params.id, userId);

  res.status(200).json({
    success: true,
    data: document,
  });
}

/*
 * ============================================================
 * POST /documents
 * ============================================================
 */
export async function createDocumentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = getUserId(req);

  const document = await createDocument({
    userId,
    title: req.body.title,
    filename: req.body.filename,
    description: req.body.description,
    fileSizeBytes: req.body.fileSizeBytes,
    correlationId: (req as any).correlationId,
  });

  res.status(201).json({
    success: true,
    data: document,
  });
}

/*
 * ============================================================
 * DELETE /documents/:id
 * ============================================================
 */
export async function deleteDocumentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = getUserId(req);

  const document = await deleteDocument(req.params.id, userId);

  res.status(200).json({
    success: true,
    data: document,
  });
}
