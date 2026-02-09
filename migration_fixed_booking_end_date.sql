-- Migration: Add recurrence_end_date to Agendamentos and update consolidation logic

-- 1. Add Column
ALTER TABLE "Agendamentos" 
ADD COLUMN IF NOT EXISTS "recurrence_end_date" date;

-- 2. Update consolidate_schedule function to respect end date
CREATE OR REPLACE FUNCTION consolidate_schedule(
  p_recurso_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS void AS $$
DECLARE
  slot RECORD;
  winner RECORD;
  inserted_count INTEGER := 0;
  
  -- Variables for Fixed Schedule Extension
  previous_week_start date;
  previous_week_end date;
  fixed_booking RECORD;
  target_date date;
  existing_check INTEGER;
BEGIN
  ---------------------------------------------------
  -- 1. PROCESS PRE-BOOKINGS (Existing Logic)
  ---------------------------------------------------
  
  -- Iterate over distinct slots that have pending pre-bookings in the range
  FOR slot IN
    SELECT DISTINCT horario_id, data
    FROM "PreReservas"
    WHERE recurso_id = p_recurso_id
    AND data >= p_start_date AND data <= p_end_date
    AND status = 'pending'
  LOOP
    -- Find the winner for this slot
    SELECT * INTO winner
    FROM get_slot_ranking(p_recurso_id, slot.data, slot.horario_id)
    LIMIT 1;

    IF winner IS NOT NULL THEN
      BEGIN
        -- Insert into Agendamentos
        INSERT INTO "Agendamentos" (recurso_id, horario_id, data, profissional_id, created_at, descricao)
        VALUES (p_recurso_id, slot.horario_id, slot.data, winner.profissional_id, now(), 'Vencedor do Ranking');
        
        inserted_count := inserted_count + 1;

      EXCEPTION WHEN unique_violation THEN
        -- Already booked suitable
        PERFORM 1;
      END;

      -- Update this pre-booking to 'won'
      UPDATE "PreReservas"
      SET status = 'won'
      WHERE recurso_id = p_recurso_id
      AND horario_id = slot.horario_id
      AND data = slot.data
      AND profissional_id = winner.profissional_id;

      -- Update others to 'lost'
      UPDATE "PreReservas"
      SET status = 'lost'
      WHERE recurso_id = p_recurso_id
      AND horario_id = slot.horario_id
      AND data = slot.data
      AND status = 'pending';
    END IF;
  END LOOP;

  ---------------------------------------------------
  -- 2. EXTEND FIXED BOOKINGS (Updated Logic)
  ---------------------------------------------------
  -- Calculate the "Source" week (Previous week relative to the target range)
  previous_week_start := p_start_date - INTERVAL '7 days';
  previous_week_end := p_end_date - INTERVAL '7 days';

  -- Find all FIXED bookings in the previous week for this resource
  FOR fixed_booking IN
    SELECT *
    FROM "Agendamentos"
    WHERE recurso_id = p_recurso_id
    AND data >= previous_week_start AND data <= previous_week_end
    AND is_fixed = true
  LOOP
    -- Calculate target date (Source Date + 7 days)
    target_date := fixed_booking.data + INTERVAL '7 days';
    
    -- CHECK RECURRENCE END DATE
    -- If recurrence_end_date is set AND target_date is AFTER it, STOP.
    IF fixed_booking.recurrence_end_date IS NOT NULL AND target_date > fixed_booking.recurrence_end_date THEN
       CONTINUE;
    END IF;

    -- Check if target date is within our consolidation range
    IF target_date >= p_start_date AND target_date <= p_end_date THEN
       
       -- Check if slot is taken
       SELECT COUNT(*) INTO existing_check 
       FROM "Agendamentos"
       WHERE recurso_id = p_recurso_id
       AND horario_id = fixed_booking.horario_id
       AND data = target_date;

       IF existing_check = 0 THEN
          -- Insert the valid extension
          INSERT INTO "Agendamentos" (
            recurso_id, 
            horario_id, 
            data, 
            profissional_id, 
            turma_id, 
            disciplina_id, 
            descricao, 
            is_fixed, 
            recurrence_end_date, -- Propagate the end date!
            created_at
          )
          VALUES (
            p_recurso_id,
            fixed_booking.horario_id,
            target_date,
            fixed_booking.profissional_id,
            fixed_booking.turma_id,
            fixed_booking.disciplina_id,
            fixed_booking.descricao,
            true, 
            fixed_booking.recurrence_end_date, -- Keep the same end date
            now()
          );
       END IF;
    END IF;
  END LOOP;

END;
$$ LANGUAGE plpgsql;
