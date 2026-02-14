/**
 * Weaviate RAG integration
 * Queries LegacyKnowledge for context to inform post generation
 */

const WEAVIATE_URL = process.env.WEAVIATE_URL || 'http://localhost:8080';

/**
 * Search LegacyKnowledge for relevant context
 * @param {string} query - topic or concept to search for
 * @param {number} limit - max results
 * @returns {string} combined context string
 */
export async function queryKnowledge(query, limit = 3) {
  const graphql = {
    query: `{
      Get {
        LegacyKnowledge(
          nearText: { concepts: ${JSON.stringify([query])} }
          limit: ${limit}
        ) {
          title
          content
          category
        }
      }
    }`
  };

  try {
    const response = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphql)
    });

    if (!response.ok) return '';

    const data = await response.json();
    const results = data?.data?.Get?.LegacyKnowledge || [];

    if (results.length === 0) return '';

    return results
      .map(r => r.content)
      .join('\n\n')
      .substring(0, 1500);
  } catch {
    // Weaviate not available — generate without RAG context
    return '';
  }
}
