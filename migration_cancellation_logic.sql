-- Migration: Improved Cancellation Logic (Double Penalty Prevention)

-- Update log_cancellation to check for duplicate penalties
CREATE OR REPLACE FUNCTION log_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  booking_week_start date;
  penalty_deadline timestamp;
  current_ts timestamp;
  existing_count int;
BEGIN
  -- 1. Check if we should apply penalty (Tuesday 12PM Rule)
  booking_week_start := date_trunc('week', OLD.data);
  penalty_deadline := booking_week_start + INTERVAL '1 day 12 hours'; -- Tuesday 12:00
  current_ts := now();

  -- If canceling before the deadline, NO PENALTY (Return without inserting)
  IF current_ts < penalty_deadline THEN
    RETURN OLD;
  END IF;

  -- 2. Check for DOUBLE PENALTY (Same Prof, Same Date, Same Slot)
  -- "Não deve se repetir 2 cancelamento para mesma aula/dia"
  -- Assuming 'aula' maps to (horario_id, data).
  SELECT COUNT(*) INTO existing_count
  FROM "Cancelamentos"
  WHERE profissional_id = OLD.profissional_id
  AND data = OLD.data
  AND horario_id = OLD.horario_id;

  IF existing_count > 0 THEN
    -- Already penalized for this slot/day. Do not double count.
    -- (e.g. User booked, cancelled, re-booked same slot, cancelled again).
    RETURN OLD;
  END IF;

  -- 3. Log Cancellation
  BEGIN
    INSERT INTO "Cancelamentos" (recurso_id, horario_id, data, profissional_id, deleted_at, reason)
    VALUES (OLD.recurso_id, OLD.horario_id, OLD.data, OLD.profissional_id, now(), 'User cancelled');
  EXCEPTION WHEN OTHERS THEN
    -- Ignore FK errors etc
    NULL;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
