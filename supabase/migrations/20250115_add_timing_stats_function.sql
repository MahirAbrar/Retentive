-- Function to get topic timing stats with aggregation at database level
CREATE OR REPLACE FUNCTION get_topic_timing_stats(
  p_user_id UUID,
  p_date_limit TIMESTAMP
)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  total_items BIGINT,
  total_reviews BIGINT,
  perfect_count BIGINT,
  on_time_count BIGINT,
  late_count BIGINT,
  items_needing_attention BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH topic_review_stats AS (
    SELECT 
      li.topic_id,
      COUNT(DISTINCT rs.id) as review_count,
      SUM(CASE WHEN rs.timing_bonus >= 2.0 THEN 1 ELSE 0 END) as perfect,
      SUM(CASE WHEN rs.timing_bonus >= 1.2 AND rs.timing_bonus < 2.0 THEN 1 ELSE 0 END) as on_time,
      SUM(CASE WHEN rs.timing_bonus < 1.2 THEN 1 ELSE 0 END) as late
    FROM review_sessions rs
    INNER JOIN learning_items li ON rs.item_id = li.id
    WHERE rs.user_id = p_user_id
      AND rs.reviewed_at >= p_date_limit
    GROUP BY li.topic_id
  ),
  item_performance AS (
    SELECT 
      li.topic_id,
      li.id as item_id,
      COUNT(rs.id) as item_reviews,
      SUM(CASE WHEN rs.timing_bonus >= 1.2 THEN 1 ELSE 0 END) as item_on_time
    FROM learning_items li
    LEFT JOIN review_sessions rs ON rs.item_id = li.id 
      AND rs.user_id = p_user_id 
      AND rs.reviewed_at >= p_date_limit
    WHERE li.user_id = p_user_id
    GROUP BY li.topic_id, li.id
  ),
  items_attention AS (
    SELECT 
      topic_id,
      COUNT(*) as needs_attention
    FROM item_performance
    WHERE item_reviews > 0 
      AND (item_on_time::FLOAT / item_reviews::FLOAT) < 0.6
    GROUP BY topic_id
  ),
  topic_item_counts AS (
    SELECT 
      topic_id,
      COUNT(*) as item_count
    FROM learning_items
    WHERE user_id = p_user_id
    GROUP BY topic_id
  )
  SELECT 
    t.id as topic_id,
    t.name as topic_name,
    COALESCE(tic.item_count, 0) as total_items,
    COALESCE(trs.review_count, 0) as total_reviews,
    COALESCE(trs.perfect, 0) as perfect_count,
    COALESCE(trs.on_time, 0) as on_time_count,
    COALESCE(trs.late, 0) as late_count,
    COALESCE(ia.needs_attention, 0) as items_needing_attention
  FROM topics t
  LEFT JOIN topic_review_stats trs ON t.id = trs.topic_id
  LEFT JOIN topic_item_counts tic ON t.id = tic.topic_id
  LEFT JOIN items_attention ia ON t.id = ia.topic_id
  WHERE t.user_id = p_user_id
    AND COALESCE(trs.review_count, 0) > 0
  ORDER BY 
    CASE 
      WHEN COALESCE(trs.review_count, 0) > 0 
      THEN ((COALESCE(trs.perfect, 0) + COALESCE(trs.on_time, 0))::FLOAT / trs.review_count::FLOAT)
      ELSE 0 
    END DESC;
END;
$$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_review_sessions_user_timing 
ON review_sessions(user_id, reviewed_at DESC, timing_bonus);

CREATE INDEX IF NOT EXISTS idx_learning_items_topic_user 
ON learning_items(topic_id, user_id);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_topic_timing_stats(UUID, TIMESTAMP) TO authenticated;