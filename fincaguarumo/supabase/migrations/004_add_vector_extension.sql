-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create content embeddings table
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- faq, page, tour, review, post, amenity, pricing_rule, payment_method, cancellation_policy, logistics
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- e5-base-instruct has 768 dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS content_embeddings_content_id_idx ON content_embeddings(content_id);
CREATE INDEX IF NOT EXISTS content_embeddings_content_type_idx ON content_embeddings(content_type);
CREATE INDEX IF NOT EXISTS content_embeddings_language_idx ON content_embeddings(language);

-- Create vector similarity search index
-- Using ivfflat for better performance on larger datasets
CREATE INDEX IF NOT EXISTS content_embeddings_embedding_idx 
ON content_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create unique constraint to prevent duplicates
ALTER TABLE content_embeddings ADD CONSTRAINT content_embeddings_unique 
UNIQUE (content_id, content_type, language);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_embeddings_updated_at 
    BEFORE UPDATE ON content_embeddings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE content_embeddings IS 'Stores vector embeddings for semantic search';
COMMENT ON COLUMN content_embeddings.content_id IS 'Unique identifier for the content (e.g., FAQ ID, page slug)';
COMMENT ON COLUMN content_embeddings.content_type IS 'Type of content: faq, page, tour, review, post, amenity, pricing_rule, payment_method, cancellation_policy, logistics';
COMMENT ON COLUMN content_embeddings.language IS 'Language code: en, es, de, nl, ru';
COMMENT ON COLUMN content_embeddings.content IS 'Original text content that was embedded';
COMMENT ON COLUMN content_embeddings.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN content_embeddings.metadata IS 'Additional metadata about the content (priority, category, etc.)';

-- Create a function for semantic search
CREATE OR REPLACE FUNCTION semantic_search(
  query_embedding vector(768),
  content_type_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_id TEXT,
  content_type TEXT,
  language TEXT,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content_id,
    ce.content_type,
    ce.language,
    ce.content,
    ce.metadata,
    (1 - (ce.embedding <=> query_embedding))::DOUBLE PRECISION as similarity
  FROM content_embeddings ce
  WHERE 
    (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND (language_filter IS NULL OR ce.language = language_filter)
    AND (1 - (ce.embedding <=> query_embedding)) >= match_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$ LANGUAGE plpgsql;

-- Create a function for hybrid search (semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(768),
  query_text TEXT,
  content_type_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL,
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3,
  match_threshold FLOAT DEFAULT 0.5,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_id TEXT,
  content_type TEXT,
  language TEXT,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION,
  keyword_score DOUBLE PRECISION,
  combined_score DOUBLE PRECISION
) AS $
BEGIN
  RETURN QUERY
  WITH 
  semantic_results AS (
    SELECT 
      ce.id,
      ce.content_id,
      ce.content_type,
      ce.language,
      ce.content,
      ce.metadata,
      (1 - (ce.embedding <=> query_embedding))::DOUBLE PRECISION as semantic_similarity,
      0.0::DOUBLE PRECISION as keyword_score
    FROM content_embeddings ce
    WHERE 
      (content_type_filter IS NULL OR ce.content_type = content_type_filter)
      AND (language_filter IS NULL OR ce.language = language_filter)
      AND (1 - (ce.embedding <=> query_embedding)) >= match_threshold
  ),
  keyword_results AS (
    SELECT 
      ce.id,
      ce.content_id,
      ce.content_type,
      ce.language,
      ce.content,
      ce.metadata,
      0.0::DOUBLE PRECISION as semantic_similarity,
      CASE 
        WHEN ce.content ILIKE '%' || query_text || '%' THEN 1.0::DOUBLE PRECISION
        WHEN ce.content ILIKE '%' || query_text THEN 0.8::DOUBLE PRECISION
        WHEN ce.content ILIKE query_text || '%' THEN 0.8::DOUBLE PRECISION
        ELSE 0.0::DOUBLE PRECISION
      END as keyword_score
    FROM content_embeddings ce
    WHERE 
      (content_type_filter IS NULL OR ce.content_type = content_type_filter)
      AND (language_filter IS NULL OR ce.language = language_filter)
      AND ce.content ILIKE '%' || query_text || '%'
  )
  SELECT 
    COALESCE(sr.id, kr.id) as id,
    COALESCE(sr.content_id, kr.content_id) as content_id,
    COALESCE(sr.content_type, kr.content_type) as content_type,
    COALESCE(sr.language, kr.language) as language,
    COALESCE(sr.content, kr.content) as content,
    COALESCE(sr.metadata, kr.metadata) as metadata,
    COALESCE(sr.semantic_similarity, 0.0::DOUBLE PRECISION)::DOUBLE PRECISION as similarity,
    COALESCE(kr.keyword_score, 0.0::DOUBLE PRECISION)::DOUBLE PRECISION as keyword_score,
    (COALESCE(sr.semantic_similarity, 0.0::DOUBLE PRECISION) * semantic_weight + COALESCE(kr.keyword_score, 0.0::DOUBLE PRECISION) * keyword_weight)::DOUBLE PRECISION as combined_score
  FROM semantic_results sr
  FULL OUTER JOIN keyword_results kr ON sr.id = kr.id
  WHERE (COALESCE(sr.semantic_similarity, 0.0::DOUBLE PRECISION) * semantic_weight + COALESCE(kr.keyword_score, 0.0::DOUBLE PRECISION) * keyword_weight) > 0
  ORDER BY combined_score DESC
  LIMIT max_results;
END;
$ LANGUAGE plpgsql;
