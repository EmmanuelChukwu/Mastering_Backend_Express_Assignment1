import { z } from "zod";

/*
 * ============================================================
 * CREATE CONVERSATION
 * ============================================================
 */
export const createConversationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .max(200)
      .optional(),
  }),
});

/*
 * ============================================================
 * LIST CONVERSATIONS
 * ============================================================
 */
export const listConversationsSchema = z.object({
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
  }),
});

/*
 * ============================================================
 * CONVERSATION ID
 * ============================================================
 */
export const conversationIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

/*
 * ============================================================
 * SEND MESSAGE
 * ============================================================
 */
export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),

  body: z.object({
    content: z
      .string()
      .trim()
      .min(1)
      .max(10000),

    documentId: z
      .string()
      .min(1)
      .optional(),
  }),
});