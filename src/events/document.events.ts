import { appEvents } from "../lib/events";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/*
 * ============================================================
 * DOCUMENT EVENTS
 * ============================================================
 *
 * The document service doesn't directly create UsageLog
 * records.
 *
 * Instead:
 *
 * document.service
 *       ↓
 * appEvents.emit()
 *       ↓
 * document.events.ts
 *       ↓
 * UsageLog
 *
 * This keeps audit logging decoupled from the business service.
 */
export const DOC_EVENTS = {
  CREATED: "doc:created",
  PROCESSED: "doc:processed",
  DELETED: "doc:deleted",
} as const;

/*
 * ============================================================
 * DOCUMENT CREATED
 * ============================================================
 */
appEvents.on(DOC_EVENTS.CREATED, async (data) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: data.userId,
        action: "document_created",
        tokens: 0,
        costUsd: 0,

        /*
         * Json field in our Prisma schema.
         *
         * We can store structured information here.
         */
        metadata: {
          documentId: data.documentId,
          title: data.title,
          fileSizeBytes: data.fileSizeBytes,
        },
      },
    });
    logger.info("doc_created_logged", {
      correlationId: data.correlationId ?? null,
      documentId: data.documentId,
    });
  } catch (error) {
    /*
     * Audit logging should not crash the original request.
     *
     * The document was already created successfully.
     * We simply record that the secondary logging operation
     * failed so it can be investigated.
     */
    logger.error("Failed to log document creation", { error });
  }
});

/*
 * ============================================================
 * DOCUMENT DELETED
 * ============================================================
 */
appEvents.on(DOC_EVENTS.DELETED, async (data) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: data.deletedBy,
        action: "document_deleted",
        tokens: 0,
        costUsd: 0,

        metadata: {
          documentId: data.documentId,
          title: data.title,
          deletedAt: new Date().toISOString(),
        },
      },
    });
    logger.info("doc_deleted_logged", {
      correlationId: data.correlationId ?? null,
      documentId: data.documentId,
    });
  } catch (error) {
    logger.error("Failed to log document deletion", { error });
  }
});
