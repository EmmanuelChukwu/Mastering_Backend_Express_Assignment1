import { prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";

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
export async function createConversation(
  userId: string,
  title?: string
) {
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
  }
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
}) {
  return prisma.$transaction(async (tx) => {
    /*
     * --------------------------------------------------------
     * 1. Verify conversation ownership
     * --------------------------------------------------------
     *
     * We must make sure User A cannot send messages into
     * User B's conversation.
     */
    const conversation = await tx.conversation.findFirst({
      where: {
        id: data.conversationId,
        userId: data.userId,
      },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }

    /*
     * --------------------------------------------------------
     * 2. Validate the optional document
     * --------------------------------------------------------
     *
     * If this message references a document, make sure:
     *
     * - it exists
     * - it belongs to this user
     * - it hasn't been soft-deleted
     *
     * IMPORTANT:
     * We use tx here, not the global prisma client.
     *
     * Everything inside the transaction must use tx.
     */
    if (data.documentId) {
      const document = await tx.document.findFirst({
        where: {
          id: data.documentId,
          userId: data.userId,
          deletedAt: null,
        },
      });

      if (!document) {
        throw new NotFoundError("Document not found");
      }
    }

    /*
     * --------------------------------------------------------
     * 3. Create user's message
     * --------------------------------------------------------
     */
    const userMessage = await tx.message.create({
      data: {
        conversationId: data.conversationId,
        documentId: data.documentId,
        role: "user",
        content: data.content,
      },
    });

    /*
     * --------------------------------------------------------
     * 4. Update conversation timestamp
     * --------------------------------------------------------
     *
     * This makes the conversation move to the top of a
     * "recent conversations" list.
     */
    await tx.conversation.update({
      where: {
        id: data.conversationId,
      },

      data: {
        updatedAt: new Date(),
      },
    });

    /*
     * --------------------------------------------------------
     * 5. Placeholder assistant response
     * --------------------------------------------------------
     *
     * The actual RAG/LLM pipeline comes later.
     *
     * For now we're proving the database/business flow.
     */
    const assistantMessage = await tx.message.create({
      data: {
        conversationId: data.conversationId,
        documentId: data.documentId,
        role: "assistant",
        content: "AI response placeholder (Week 4)",

        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
      },
    });

    /*
     * --------------------------------------------------------
     * 6. Record usage
     * --------------------------------------------------------
     *
     * This MUST happen inside the same transaction.
     *
     * If UsageLog creation fails:
     *
     *     user message → rollback
     *     conversation update → rollback
     *     assistant message → rollback
     *     usage log → rollback
     *
     * Nothing is left partially completed.
     */
    await tx.usageLog.create({
      data: {
        userId: data.userId,
        action: "chat",
        tokens: 0,
        costUsd: 0,
      },
    });

    /*
     * Everything succeeded.
     *
     * Prisma commits the transaction automatically.
     */
    return {
      userMessage,
      assistantMessage,
    };
  });
}