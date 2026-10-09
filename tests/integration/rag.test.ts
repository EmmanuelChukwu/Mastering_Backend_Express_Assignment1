import { describe, it, expect, beforeAll } from "vitest";
import { semanticSearch } from "../../src/services/search.service";

describe("RAG retrieval quality", () => {
  // Assume test documents are already ingested
  // with known content about specific topics

  it("finds the refund policy when asked about returns", async () => {
    const results = await semanticSearch({
      query: "How do I return a product?",
      userId: testUserId,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(0.5);

    // The top result should contain refund-related content
    const topContent = results[0].content.toLowerCase();
    expect(
      topContent.includes("return") ||
        topContent.includes("refund") ||
        topContent.includes("reimbursement"),
    ).toBe(true);
  });

  it("returns low scores for irrelevant questions", async () => {
    const results = await semanticSearch({
      query: "What is quantum computing?",
      userId: testUserId,
      minScore: 0.5,
    });

    // Should return nothing if documents are about company policies
    expect(results.length).toBe(0);
  });

  it("respects document ownership", async () => {
    const results = await semanticSearch({
      query: "return policy",
      userId: otherUserId, // Different user
    });

    // Should not find testUser's documents
    const hasTestUserDocs = results.some(
      (r) => r.documentId === testDocumentId,
    );
    expect(hasTestUserDocs).toBe(false);
  });
});
