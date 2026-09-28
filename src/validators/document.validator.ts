import { z } from "zod";

/*
 * ============================================================
 * CREATE DOCUMENT
 * ============================================================
 */
export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),

    filename: z.string().trim().min(1).max(255),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),

    fileSizeBytes: z
      .coerce
      .number()
      .int()
      .nonnegative()
      .optional(),
  }),
});

/*
 * ============================================================
 * DOCUMENT ID
 * ============================================================
 */
export const documentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

/*
 * ============================================================
 * LIST DOCUMENTS
 * ============================================================
 *
 * These query parameters support:
 *
 * ?page=1
 * ?limit=20
 * ?status=ready
 * ?search=test
 * ?sortBy=title
 * ?sortOrder=asc
 */
export const listDocumentsSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    status: z
      .enum([
        "pending",
        "processing",
        "ready",
        "failed",
      ])
      .optional(),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),

    sortBy: z
      .enum([
        "createdAt",
        "title",
        "chunkCount",
      ])
      .default("createdAt"),

    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc"),
  }),
});