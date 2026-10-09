import { prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";
import { semanticSearch } from "./search.service";
import { assembleContext, generateRAGResponse } from "./rag.service";

/*
 * ============================================================
 * CONVERSATION SERVICE
 * ============================================================
 *
 * Conversation is the aggregate root for:
 *
 *     Conversation
 *          ↓
 *       Messages
 *
 * Therefore messages are created through this service rather
 * than through a separate message.service.ts.
 * ============================================================
 */

/*
 * ============================================================
 * CREATE CONVERSATION
 * ============================================================
 */
export async function createConversation(userId: string, title?: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title,
    },
  });
}

/*
 * ============================================================
 * LIST CONVERSATIONS
 * ============================================================
 *
 * The frontend wants:
 *
 * - conversation information
 * - latest message
 * - message count
 * - updatedAt
 *
 * We fetch those together rather than doing:
 *
 *     conversation 1 → query messages
 *     conversation 2 → query messages
 *     conversation 3 → query messages
 *
 * That would create the N+1 problem.
 */
export async function listConversations(
  userId: string,
  options: {
    page: number;
    limit: number;
  },
) {
  const { page, limit } = options;

  /*
   * Both queries can run independently.
   *
   * Promise.all lets them execute concurrently.
   */
  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        userId,
      },

      orderBy: {
        updatedAt: "desc",
      },

      skip: (page - 1) * limit,
      take: limit,

      include: {
        /*
         * Get only the newest message.
         *
         * This prevents us from loading an entire conversation
         * history simply to display a preview.
         */
        messages: {
          orderBy: {
            createdAt: "desc",
          },

          take: 1,

          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },

        /*
         * Prisma calculates the count in the database.
         *
         * We don't need to load every Message into Node.js.
         */
        _count: {
          select: {
            messages: true,
          },
        },
      },
    }),

    prisma.conversation.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    data: conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,

      messageCount: conversation._count.messages,

      /*
       * Since we requested take: 1 above:
       *
       * messages[0] = latest message
       */
      lastMessage: conversation.messages[0] ?? null,

      updatedAt: conversation.updatedAt,
    })),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
 * ============================================================
 * SEND MESSAGE
 * ============================================================
 *
 * This is the most important function in this lesson.
 *
 * Several database operations belong to ONE business operation:
 *
 * 1. Verify conversation ownership
 * 2. Verify referenced document if supplied
 * 3. Create user message
 * 4. Update conversation
 * 5. Create assistant message
 * 6. Record usage
 *
 * If one fails, everything should roll back.
 *
 * That's why we use a transaction.
 */
export async function sendMessage(data: {
  conversationId: string;
  userId: string;
  content: string;
  documentId?: string;
  correlationId: string;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify conversation ownership (same as before)
    const conversation = await tx.conversation.findUnique({
      where: { id: data.conversationId },
    });
    if (!conversation || conversation.userId !== data.userId) {
      throw new NotFoundError("Conversation not found");
    }

    // 2. Save user message
    const userMessage = await tx.message.create({
      data: {
        conversationId: data.conversationId,
        documentId: data.documentId,
        role: "user",
        content: data.content,
      },
    });

    // 3. Load recent conversation history
    const history = await tx.message.findMany({
      where: { conversationId: data.conversationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    const conversationHistory = history.reverse();

    // 4. RAG: Retrieve
    const searchResults = await semanticSearch({
      query: data.content,
      userId: data.userId,
      documentId: data.documentId,
      correlationId: data.correlationId,
    });

    // 5. RAG: Augment
    const context = assembleContext(searchResults);

    // 6. RAG: Generate
    const ragResponse = await generateRAGResponse({
      question: data.content,
      context,
      conversationHistory,
      userId: data.userId,
      conversationId: data.conversationId,
      correlationId: data.correlationId,
    });

    // 7. Save assistant message with metadata
    const assistantMessage = await tx.message.create({
      data: {
        conversationId: data.conversationId,
        documentId: data.documentId,
        role: "assistant",
        content: ragResponse.answer,
        promptTokens: ragResponse.tokensUsed.prompt,
        completionTokens: ragResponse.tokensUsed.completion,
        costUsd: ragResponse.costUsd,
        // Prisma `Message` model does not have a `metadata` JSON field in this schema.
        // Store smaller audit info in `content` or extend schema if needed.
      },
    });

    // 8. Touch conversation updatedAt
    await tx.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      userMessage,
      assistantMessage: {
        ...assistantMessage,
        citations: ragResponse.citations,
      },
    };
  });
}
