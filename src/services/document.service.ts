import { prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";
import { appEvents } from "../lib/events";
import { DOC_EVENTS } from "../events/document.events";
import { queueDocumentForProcessing } from "../queues/document.queue";

/*
 * ============================================================
 * DOCUMENT SERVICE
 * ============================================================
 *
 * Document is an aggregate root.
 *
 * That means operations involving:
 *
 *     Document
 *        ↓
 *      Chunks
 *
 * are controlled by this service.
 *
 * We don't create a separate chunk.service.ts because a Chunk
 * doesn't make sense independently of its Document.
 * ============================================================
 */

interface ListDocumentsOptions {
  page: number;
  limit: number;
  status?: "pending" | "processing" | "ready" | "failed";
  search?: string;
  sortBy?: "createdAt" | "title" | "chunkCount";
  sortOrder?: "asc" | "desc";
}

/*
 * ============================================================
 * LIST DOCUMENTS
 * ============================================================
 *
 * Supports:
 *
 * - pagination
 * - status filtering
 * - title/description search
 * - sorting
 *
 * Soft-deleted documents are deliberately excluded.
 */
export async function listDocuments(
  userId: string,
  options: ListDocumentsOptions,
) {
  const {
    page,
    limit,
    status,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  /*
   * Build the Prisma WHERE condition dynamically.
   *
   * Every document query belonging to a normal user starts
   * with these two conditions:
   *
   *     userId
   *     deletedAt: null
   *
   * This prevents users from seeing another user's documents
   * and prevents soft-deleted documents from appearing.
   */
  const where = {
    userId,
    deletedAt: null,

    ...(status ? { status } : {}),

    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  /*
   * Run the data query and COUNT query simultaneously.
   *
   * Promise.all means the application doesn't unnecessarily
   * wait for one database query before starting the other.
   */
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,

      /*
       * Only select what the list endpoint actually needs.
       *
       * We don't need to send the entire Document object.
       */
      select: {
        id: true,
        title: true,
        filename: true,
        description: true,
        status: true,
        chunkCount: true,
        fileSizeBytes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.document.count({
      where,
    }),
  ]);

  return {
    data: documents,

    meta: {
      page,
      limit,
      total,

      /*
       * Useful for the frontend when rendering pagination.
       */
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
 * ============================================================
 * GET DOCUMENT
 * ============================================================
 *
 * Fetch one document belonging to the authenticated user.
 *
 * Notice the deletedAt filter.
 *
 * A soft-deleted document behaves as though it doesn't exist
 * from the normal user's perspective.
 */
export async function getDocument(documentId: string, userId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
      deletedAt: null,
    },

    include: {
      /*
       * Include chunks when viewing a single document.
       *
       * We don't include chunks in the list endpoint because
       * that could become very expensive.
       */
      chunks: {
        orderBy: {
          chunkIndex: "asc",
        },
      },
    },
  });

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  return document;
}

/*
 * ============================================================
 * CREATE DOCUMENT
 * ============================================================
 *
 * For this lesson, document creation means creating the
 * document record.
 *
 * Actual file processing/chunk generation will become an
 * asynchronous job in the next lesson.
 */
export async function createDocument(data: {
  userId: string;
  title: string;
  filename: string;
  description?: string;
  fileSizeBytes?: number;
  correlationId?: string;
}) {
  const document = await prisma.document.create({
    data: {
      userId: data.userId,
      title: data.title,
      filename: data.filename,
      description: data.description,
      fileSizeBytes: data.fileSizeBytes,

      /*
       * The schema defaults this to "pending", but explicitly
       * understanding the lifecycle is useful:
       *
       * pending → processing → ready
       *
       * or
       *
       * pending → processing → failed
       */
      status: "pending",
    },
  });

  // Queue for background processing
  const jobId = await queueDocumentForProcessing(
    document.id,
    data.userId,
    data.correlationId,
  );

  /*
   * The service doesn't directly write the audit log.
   *
   * It emits an event.
   *
   * document.events.ts listens for this event and handles
   * the audit/usage logging separately.
   */
  appEvents.emit(DOC_EVENTS.CREATED, {
    userId: data.userId,
    documentId: document.id,
    title: document.title,
    fileSizeBytes: document.fileSizeBytes,
    correlationId: data.correlationId,
  });

  return document;
}

/*
 * ============================================================
 * DELETE DOCUMENT — SOFT DELETE
 * ============================================================
 *
 * We DO NOT use prisma.document.delete().
 *
 * Instead we keep the database row and mark it as deleted.
 *
 * This allows:
 *
 * - recovery
 * - auditing
 * - administrative investigation
 * - future restore functionality
 */
export async function deleteDocument(documentId: string, userId: string) {
  /*
   * First retrieve the document.
   *
   * We need the title for the audit event.
   */
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
  });

  /*
   * Treat an already-deleted document as nonexistent.
   */
  if (!document || document.deletedAt) {
    throw new NotFoundError("Document not found");
  }

  /*
   * Mark the document as deleted instead of physically
   * removing it.
   */
  const deletedDocument = await prisma.document.update({
    where: {
      id: documentId,
    },

    data: {
      deletedAt: new Date(),
      deletedBy: userId,
    },
  });

  /*
   * Tell the event system that the deletion happened.
   */
  appEvents.emit(DOC_EVENTS.DELETED, {
    deletedBy: userId,
    documentId: document.id,
    title: document.title,
  });

  return deletedDocument;
}
