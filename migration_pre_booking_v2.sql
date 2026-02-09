-- ==============================================================================
-- Migration V2: Configurable Days, Enhanced Scoring (A+C+O), and Conditional Cancellation
-- ==============================================================================

-- 1. Add `pre_booking_days` to Escola table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Escola' AND column_name='pre_booking_days') THEN
        ALTER TABLE "Escola" ADD COLUMN "pre_booking_days" integer[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Escola' AND column_name='use_cancellation_penalty') THEN
        ALTER TABLE "Escola" ADD COLUMN "use_cancellation_penalty" boolean DEFAULT true;
    END IF;
END $$;

-- 2. Update `log_cancellation` Trigger Logic
-- Requirement: "Until Tuesday 12:00 PM of the booking week, deletion does NOT count as cancellation."
-- We assume "Booking Week" starts on Monday.
-- Tuesday 12:00 PM = 1.5 days into the week.
CREATE OR REPLACE FUNCTION log_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  booking_week_start date;
  penalty_deadline timestamp;
  current_ts timestamp;
BEGIN
  -- Get the Monday of the week for the booking date
  booking_week_start := date_trunc('week', OLD.data);
  
  -- Deadline is Tuesday 12:00 PM of that week
  -- Monday = Start. Tuesday = Start + 1 day. Noon = + 12 hours.
  penalty_deadline := booking_week_start + INTERVAL '1 day 12 hours';
  
  current_ts := now();

  -- If we are BEFORE the deadline, do NOT log it (No Penalty)
  IF current_ts < penalty_deadline THEN
    RETURN OLD;
  END IF;

  -- Otherwise, log it as a cancellation (Penalty applies)
  INSERT INTO "Cancelamentos" (recurso_id, horario_id, data, profissional_id, deleted_at, reason)
  VALUES (OLD.recurso_id, OLD.horario_id, OLD.data, OLD.profissional_id, now(), 'User cancelled (Late)');
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger to ensure it uses the new function
DROP TRIGGER IF EXISTS log_agendamento_delete ON "Agendamentos";
CREATE TRIGGER log_agendamento_delete
BEFORE DELETE ON "Agendamentos"
FOR EACH ROW
EXECUTE FUNCTION log_cancellation();


-- 3. Calculate Detailed Score Function (A + C + O)
DROP FUNCTION IF EXISTS calculate_detailed_score(uuid, uuid, date, timestamptz, text, uuid);
DROP FUNCTION IF EXISTS calculate_detailed_score(uuid, uuid, date, timestamptz, text); -- Drop old signature if exists

CREATE OR REPLACE FUNCTION calculate_detailed_score(
  p_profissional_id uuid,
  p_recurso_id uuid,
  p_target_date date,
  p_created_at timestamptz,
  p_horario_id text,
  p_pre_reserva_id uuid
)
RETURNS TABLE (
  score_total bigint,
  score_a bigint,
  score_c bigint,
  score_o bigint -- Renamed from score_t to score_o
) AS $$
DECLARE
  v_score_a bigint;
  v_score_c bigint;
  v_score_o bigint;
  v_use_cancellation_penalty boolean;
BEGIN
  -- Check if cancellation penalty is enabled in School Settings (first record)
  -- Default to true if not specified
  SELECT COALESCE("use_cancellation_penalty", true) INTO v_use_cancellation_penalty
  FROM "Escola"
  LIMIT 1;

  -- Metric A: Agendamentos in last 21 days (Unique Days)
  SELECT COUNT(DISTINCT data) INTO v_score_a
  FROM "Agendamentos"
  WHERE profissional_id = p_profissional_id
  AND recurso_id = p_recurso_id
  AND data >= (p_target_date - INTERVAL '21 days')
  AND data < p_target_date;

  -- Metric C: Cancelamentos in last 31 days (Unique Days)
  -- Only calculate if penalty is enabled
  IF v_use_cancellation_penalty THEN
    SELECT COUNT(DISTINCT data) INTO v_score_c
    FROM "Cancelamentos"
    WHERE profissional_id = p_profissional_id
    AND recurso_id = p_recurso_id
    AND data >= (p_target_date - INTERVAL '31 days')
    AND data < p_target_date;
  ELSE
    v_score_c := 0;
  END IF;

  -- Metric O: Position in Queue (Order)
  -- We count how many requests for THIS slot have a created_at BEFORE this one.
  -- Add 1 to make it 1-based (0 older = 1st).
  -- Tie-breaker: If created_at is identical, use ID to break tie.
  SELECT COUNT(*) + 1 INTO v_score_o
  FROM "PreReservas"
  WHERE recurso_id = p_recurso_id
  AND data = p_target_date
  AND horario_id = p_horario_id
  AND status = 'pending'
  AND (
    created_at < p_created_at 
    OR (created_at = p_created_at AND id < p_pre_reserva_id)
  );

  score_a := v_score_a;
  score_c := v_score_c;
  score_o := v_score_o;
  score_total := v_score_a + v_score_c + v_score_o;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;


-- 4. Get Slot Ranking Function
-- Updates usage of calculate_detailed_score and returns O instead of T
DROP FUNCTION IF EXISTS get_slot_ranking(uuid, date, text);

CREATE OR REPLACE FUNCTION get_slot_ranking(p_recurso_id uuid, p_data date, p_horario_id text)
RETURNS TABLE (
  profissional_id uuid,
  nome text,
  alias text,
  score bigint,
  score_a bigint,
  score_c bigint,
  score_o bigint, -- Renamed from score_t
  created_at timestamptz,
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
    pr.horario_id,
    pr.id -- Pass ID for deterministic tie-breaking
  ) s
  WHERE pr.recurso_id = p_recurso_id
  AND pr.data = p_data
  AND pr.horario_id = p_horario_id
  AND pr.status = 'pending';
END;
$$ LANGUAGE plpgsql;
