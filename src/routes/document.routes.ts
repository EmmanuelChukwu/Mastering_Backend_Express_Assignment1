import express from "express";

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
router.get(
  "/",
  validate(listDocumentsSchema),
  getDocuments
);

/*
 * GET /api/v1/documents/:id
 */
router.get(
  "/:id",
  validate(documentIdSchema),
  getDocumentById
);

/*
 * POST /api/v1/documents
 */
router.post(
  "/",
  validate(createDocumentSchema),
  createDocumentController
);

/*
 * DELETE /api/v1/documents/:id
 */
router.delete(
  "/:id",
  validate(documentIdSchema),
  deleteDocumentController
);

export default router;