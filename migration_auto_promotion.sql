
-- Migration: Auto-Promotion on Cancellation
-- Handles the requirement: "If the 1st professor cancels, the 2nd assumes automatically."

CREATE OR REPLACE FUNCTION handle_auto_promotion()
RETURNS TRIGGER AS $$
DECLARE
  winner RECORD;
  candidate RECORD;
  v_score_total bigint;
  v_score_a bigint;
  v_score_c bigint;
  v_score_o bigint;
  selected_candidate_id uuid := NULL;
  best_rank_score bigint := 999999;
  best_rank_created timestamptz := 'infinity';
BEGIN
  -- We only care if a booking is DELETED.
  -- OLD contains the deleted record.
  
  -- Check if there are any candidates in PreReservas for this slot
  -- We consider 'pending' (if before consolidation) AND 'lost' (if after consolidation)
  -- We do NOT consider 'cancelled' or 'won' (obviously)
  
  FOR candidate IN
    SELECT * FROM "PreReservas"
    WHERE recurso_id = OLD.recurso_id
    AND data = OLD.data
    AND horario_id = OLD.horario_id::text -- Explicit cast to text to match column type
    AND status IN ('pending', 'lost')
  LOOP
    -- Calculate score for this candidate
    SELECT score_total INTO v_score_total
    FROM calculate_detailed_score(
      candidate.profissional_id,
      candidate.recurso_id,
      candidate.data,
      candidate.created_at,
      candidate.horario_id,
      candidate.id
    );
    
    -- Check if this is the best candidate so far
    -- Logic: Lower Score is better. Tie-breaker: Older CreatedAt is better.
    IF v_score_total < best_rank_score THEN
       best_rank_score := v_score_total;
       best_rank_created := candidate.created_at;
       selected_candidate_id := candidate.id;
    ELSIF v_score_total = best_rank_score THEN
       IF candidate.created_at < best_rank_created THEN
          best_rank_created := candidate.created_at;
          selected_candidate_id := candidate.id;
       END IF;
    END IF;
    
  END LOOP;
  
  -- If we found a winner
  IF selected_candidate_id IS NOT NULL THEN
    -- 1. Fetch full candidate details
    SELECT * INTO winner FROM "PreReservas" WHERE id = selected_candidate_id;
    
    -- 2. Insert into Agendamentos
    -- We use the Turma/Disciplina from the PreReserva if available (added in fix_columns migration)
    -- If not available (old records), we might insert NULLs which is fine if constraints allow.
    -- Ideally we should fetch Turma/Disciplina.
    
    INSERT INTO "Agendamentos" (
      recurso_id, 
      horario_id, 
      data, 
      profissional_id, 
      turma_id, 
      disciplina_id, 
      created_at, 
      descricao,
      is_fixed
    )
    VALUES (
      winner.recurso_id,
      winner.horario_id::uuid, -- Cast back to UUID for Agendamentos
      winner.data,
      winner.profissional_id,
      winner.turma_id, -- Might be null if not set
      winner.disciplina_id, -- Might be null if not set
      now(),
      'Promovido Automaticamente (Fila de Espera)',
      false -- Auto-promoted bookings are rarely fixed immediately, safer to set false
    );
    
    -- 3. Update PreReservas status
    UPDATE "PreReservas" 
    SET status = 'won' 
    WHERE id = selected_candidate_id;
    
    -- We do NOT set others to 'lost' here because maybe this new winner cancels too?
    -- If we keep them as 'lost' or 'pending', they remain eligible for the NEXT cancellation.
    -- So we just leave them alone.
    
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger Definition
DROP TRIGGER IF EXISTS trigger_auto_promotion ON "Agendamentos";
CREATE TRIGGER trigger_auto_promotion
AFTER DELETE ON "Agendamentos"
FOR EACH ROW
EXECUTE FUNCTION handle_auto_promotion();
