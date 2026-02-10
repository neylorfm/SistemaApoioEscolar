-- Migration: Fix get_slot_ranking to include lost_provisional candidates
-- This is necessary so they can be promoted if the winner cancels.

CREATE OR REPLACE FUNCTION get_slot_ranking(
  p_recurso_id uuid,
  p_data date,
  p_horario_id varchar
)
RETURNS TABLE (
  profissional_id uuid,
  nome text,
  alias text,
  score numeric,
  score_a integer,
  score_c integer,
  score_o integer,
  created_at timestamp without time zone,
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
  CROSS JOIN LATERAL calculate_detailed_score(pr.profissional_id, p_recurso_id, p_data, p_horario_id, pr.created_at) s
  WHERE pr.recurso_id = p_recurso_id
  AND pr.data = p_data
  AND pr.horario_id = p_horario_id
  AND pr.status IN ('pending', 'lost_provisional'); -- Changed from = 'pending'
END;
$$ LANGUAGE plpgsql;
