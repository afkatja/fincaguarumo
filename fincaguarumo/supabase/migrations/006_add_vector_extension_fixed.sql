-- Fix: Explicit type casting for hybrid_search function
-- Run this in Supabase SQL Editor to fix the type mismatch error
-- "Returned type numeric does not match expected type double precision in column 8"

DROP FUNCTION IF EXISTS hybrid_search(
  vector(768), TEXT, TEXT, TEXT, FLOAT, FLOAT, FLOAT, INT
);

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
) AS $$
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
$$ LANGUAGE plpgsql;

-- Verify the fix
SELECT proname, prorettype::regtype
FROM pg_proc 
WHERE proname = 'hybrid_search';
