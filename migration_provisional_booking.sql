-- Migration: Provisional Booking System (Two-Phase Consolidation)

-- 1. Create function to calculate PROVISIONAL winners (Friday 5 AM)
-- This does NOT create Agendamentos yet. It just marks PreReservas.
CREATE OR REPLACE FUNCTION calculate_provisional_winners(
  p_recurso_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS void AS $$
DECLARE
  slot RECORD;
  winner RECORD;
BEGIN
  -- Iterate distinct slots with pending requests
  FOR slot IN
    SELECT DISTINCT horario_id, data
    FROM "PreReservas"
    WHERE recurso_id = p_recurso_id
    AND data >= p_start_date AND data <= p_end_date
    AND status = 'pending'
  LOOP
    -- Find winner
    SELECT * INTO winner
    FROM get_slot_ranking(p_recurso_id, slot.data, slot.horario_id)
    LIMIT 1;

    IF winner IS NOT NULL THEN
      -- Mark winner as 'won_provisional'
      UPDATE "PreReservas"
      SET status = 'won_provisional'
      WHERE recurso_id = p_recurso_id
      AND horario_id = slot.horario_id
      AND data = slot.data
      AND profissional_id = winner.profissional_id;

      -- Mark others as 'lost_provisional' (so they know they are in queue)
      UPDATE "PreReservas"
      SET status = 'lost_provisional'
      WHERE recurso_id = p_recurso_id
      AND horario_id = slot.horario_id
      AND data = slot.data
      AND status = 'pending';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to CONFIRM provisional winners (Friday 12 PM)
-- This moves 'won_provisional' to Agendamentos.
CREATE OR REPLACE FUNCTION confirm_provisional_winners(
  p_recurso_id uuid
) RETURNS void AS $$
DECLARE
  reserva RECORD;
BEGIN
  FOR reserva IN
    SELECT * FROM "PreReservas"
    WHERE recurso_id = p_recurso_id
    AND status = 'won_provisional'
  LOOP
    BEGIN
      -- Insert into Agendamentos
      INSERT INTO "Agendamentos" (
        recurso_id, 
        horario_id, 
        data, 
        profissional_id, 
        turma_id,
        disciplina_id,
        created_at, 
        descricao
      )
      VALUES (
        reserva.recurso_id, 
        reserva.horario_id, 
        reserva.data, 
        reserva.profissional_id, 
        reserva.turma_id,
        reserva.disciplina_id,
        now(), 
        'Confirmado automaticamente (Prioridade)'
      );
      
      -- Update status to confirmed
      UPDATE "PreReservas"
      SET status = 'confirmed' -- or 'won' logic, or we can just keep it as history
      WHERE id = reserva.id;

    EXCEPTION WHEN unique_violation THEN
      -- If already booked, maybe by admin override?
      -- Just mark as processed/cancelled?
      UPDATE "PreReservas" SET status = 'cancelled_conflict' WHERE id = reserva.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to AUTO-PROMOTE if a Provisional Winner Cancels
CREATE OR REPLACE FUNCTION on_provisional_cancel()
RETURNS TRIGGER AS $$
DECLARE
  next_winner RECORD;
BEGIN
  -- Only act if the deleted/cancelled booking was a 'won_provisional'
  IF OLD.status = 'won_provisional' THEN
    -- Find the next best candidate (lost_provisional or pending)
    SELECT * INTO next_winner
    FROM get_slot_ranking(OLD.recurso_id, OLD.data, OLD.horario_id)
    -- We want the best rank that isn't the one just deleted (obviously)
    -- get_slot_ranking sorts by score ASC. The deleted one is gone from table?
    -- This is AFTER DELETE or BEFORE DELETE?
    -- If created as AFTER DELETE, the record is gone.
    LIMIT 1;

    IF next_winner IS NOT NULL THEN
      -- Promote next winner
      UPDATE "PreReservas"
      SET status = 'won_provisional'
      WHERE recurso_id = OLD.recurso_id
      AND horario_id = OLD.horario_id
      AND data = OLD.data
      AND profissional_id = next_winner.profissional_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_provisional_cancel ON "PreReservas";
CREATE TRIGGER trigger_provisional_cancel
AFTER DELETE ON "PreReservas"
FOR EACH ROW
EXECUTE FUNCTION on_provisional_cancel();

-- Also handle manual status change to 'cancelled' (if using soft delete)
-- But we usually use DELETE for dismissal.
-- If user clicks "Dispensar", frontend calls DELETE.

