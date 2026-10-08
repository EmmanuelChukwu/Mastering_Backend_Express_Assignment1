import { Worker, Job } from "bullmq";
import { redisConnection } from "./connection";
import { prisma } from "../lib/prisma";
import { appEvents } from "../lib/events";
import { deadLetterQueue } from "./dead-letter.queue";
import { extractText, detectFormat } from "../lib/documentExtractor";
import { chunkDocument } from "../lib/chunker";
import {
  generateEmbeddingsBatchCached,
  storeChunkEmbeddingsBatch,
} from "../services/embedding.service";

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "../lib/logger";

const worker = new Worker(
  "document-processing",
  async (job: Job) => {
    const { documentId, userId, correlationId } = job.data as {
      documentId: string;
      userId: string;
      correlationId?: string;
    };

    logger.info("job_started", {
      correlationId,
      documentId,
      attempt: job.attemptsMade + 1,
    });

    // Step 1: Fetch the document metadata (filename) and mark processing
    const doc = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      select: { id: true, filename: true, userId: true },
    });

    // Mark as processing
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "processing" },
    });

    try {
      await job.updateProgress(10);

      // Step 2: Extract text
      const format = detectFormat(doc.filename);
      // Ensure we selected content when fetching the document metadata
      const filePath = path.join(process.cwd(), "uploads", doc.filename);
      const fileBuffer = await fs.readFile(filePath);
      const { text, pageCount } = await extractText(fileBuffer, format);
      await job.updateProgress(15);

      logger.info("Text extracted", {
        correlationId,
        documentId,
        format,
        textLength: text.length,
        pageCount,
      });

      // Step 3: Chunk the text
      const chunks = chunkDocument(text, {
        maxTokens: 500,
        overlapTokens: 50,
        minChunkTokens: 50,
      });
      await job.updateProgress(30);

      logger.info("Document chunked", {
        correlationId,
        documentId,
        chunkCount: chunks.length,
        avgTokens: Math.round(
          chunks.reduce((sum, c) => sum + c.tokenEstimate, 0) / chunks.length,
        ),
      });

      // Step 4: Store chunks in database
      await prisma.$transaction(async (tx) => {
        await tx.chunk.deleteMany({ where: { documentId } });
        await tx.chunk.createMany({
          data: chunks.map((chunk) => ({
            documentId,
            index: chunk.index,
            content: chunk.text,
            tokenCount: chunk.tokenEstimate,
          })),
        });
      });
      await job.updateProgress(50);

      // Step 5: Generate embeddings (the expensive step)
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await generateEmbeddingsBatchCached(chunkTexts);
      await job.updateProgress(85);

      // Step 6: Store embeddings
      const storedChunks = await prisma.chunk.findMany({
        where: { documentId },
        orderBy: { index: "asc" },
        select: { id: true },
      });

      await storeChunkEmbeddingsBatch(
        storedChunks.map((c, i) => ({
          id: c.id,
          embedding: embeddings[i],
        })),
      );
      await job.updateProgress(95);

      // Step 7: Mark complete
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "ready",
          chunkCount: chunks.length,
        },
      });
      await job.updateProgress(100);
      // Emit completion event (no timing metrics available here)
      appEvents.emit("doc:processed", {
        documentId,
        userId,
        correlationId,
        chunkCount: chunks.length,
        format,
        pageCount,
      });

      logger.info("Document processing complete", {
        correlationId,
        documentId,
        chunkCount: chunks.length,
      });

      return {
        success: true,
        chunks: chunks.length,
      };
    } catch (error) {
      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: "failed",
          },
        });
      }
      logger.error("Document processing failed", {
        correlationId,
        documentId,
        error: (error as Error).message,
        attempt: job.attemptsMade + 1,
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
);
