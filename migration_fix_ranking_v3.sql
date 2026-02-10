-- Migration: Fix get_slot_ranking (V3) - Correct Return Types & Drop Old Versions

-- 1. Drop existing functions to clear conflicts
DROP FUNCTION IF EXISTS get_slot_ranking(uuid, date, varchar);
DROP FUNCTION IF EXISTS get_slot_ranking(uuid, date, text);

-- 2. Create correct function with matching return text
CREATE OR REPLACE FUNCTION get_slot_ranking(
  p_recurso_id uuid,
  p_data date,
  p_horario_id text -- Standardize on TEXT, compatible with Valid UUID strings
)
RETURNS TABLE (
  profissional_id uuid,
  nome text,
  alias text,
  score bigint,       -- MATCHING ORIGINAL TYPES
  score_a bigint,
  score_c bigint,
  score_o bigint,
  created_at timestamptz, -- MATCHING ORIGINAL TYPES
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.profissional_id,
    p.nome,
    p.alias,
    s.score_total as score,
    s.score_a,
    s.score_c,
    s.score_o,
    pr.created_at,
    ROW_NUMBER() OVER (
      ORDER BY
        s.score_total ASC, -- Lower score is better
        pr.created_at ASC  -- First come first served tie-breaker
    ) as rank
  FROM "PreReservas" pr
  JOIN "Profissionais" p ON pr.profissional_id = p.id
  CROSS JOIN LATERAL calculate_detailed_score(
    pr.profissional_id, 
    p_recurso_id, 
    p_data, 
    pr.created_at, 
    p_horario_id,
    pr.id
  ) s
  WHERE pr.recurso_id = p_recurso_id
  AND pr.data = p_data
  AND pr.horario_id = p_horario_id
  AND pr.status IN ('pending', 'lost_provisional'); 
END;
$$ LANGUAGE plpgsql;
