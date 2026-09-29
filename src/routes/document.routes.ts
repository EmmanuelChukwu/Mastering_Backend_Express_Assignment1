import express from "express";
import { documentQueue } from "../queues/document.queue";
import { requirePermission } from "../middleware/authorize";
import { prisma } from "../lib/prisma";

import {
  createDocumentController,
  deleteDocumentController,
  getDocumentById,
  getDocuments,
} from "../controllers/document.controller";

import { validate } from "../middleware/validate";

import {
  createDocumentSchema,
  documentIdSchema,
  listDocumentsSchema,
} from "../validators/document.validator";

/*
 * IMPORTANT:
 *
 * Replace the import below with the exact name of the
 * authentication middleware you already created in the project
 * if yours is named differently.
 */
import { authenticate } from "../middleware/auth";

const router = express.Router();

/*
 * Every document route requires authentication.
 */
router.use(authenticate);

/*
 * GET /api/v1/documents
 */
router.get("/", validate(listDocumentsSchema), getDocuments);

/*
 * GET /api/v1/documents/:id
 */
router.get("/:id", validate(documentIdSchema), getDocumentById);

router.get(
  "/:id/processing-status",
  authenticate,
  requirePermission("documents:read"),
  async (req, res) => {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, userId: true },
    });

    if (!doc || doc.userId !== req.user!.id) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }

    // Try to find the active job for this document
    const jobs = await documentQueue.getJobs(["active", "waiting"]);
    const activeJob = jobs.find((j) => j.data.documentId === req.params.id);

    res.json({
      success: true,
      data: {
        status: doc.status,
        error: null,
        progress: activeJob ? await activeJob.progress : null,
      },
    });
  },
);

/*
 * POST /api/v1/documents
 */
router.post("/", validate(createDocumentSchema), createDocumentController);

/*
 * DELETE /api/v1/documents/:id
 */
router.delete("/:id", validate(documentIdSchema), deleteDocumentController);

export default router;
