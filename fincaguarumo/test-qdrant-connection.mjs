// Test Qdrant connection
import { QdrantClient } from "@qdrant/js-client-rest";

const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantApiKey = process.env.QDRANT_API_KEY;

console.log('Testing Qdrant connection...');
console.log('URL:', qdrantUrl);
console.log('API Key configured:', !!qdrantApiKey);

const client = new QdrantClient({
  url: qdrantUrl,
  ...(qdrantApiKey && { apiKey: qdrantApiKey }),
});

async function testConnection() {
  try {
    // Test basic connection
    const collections = await client.getCollections();
    console.log('✅ Qdrant connection successful');
    console.log('Available collections:', collections.collections.map(c => c.name));
    
    // Check if content_embeddings exists
    const contentEmbeddingsExists = collections.collections.some(c => c.name === 'content_embeddings');
    console.log('content_embeddings collection exists:', contentEmbeddingsExists);
    
  } catch (error) {
    console.error('❌ Qdrant connection failed:', error.message);
    if (error.status === 404) {
      console.log('This might be a URL or authentication issue');
    }
  }
}

testConnection();
