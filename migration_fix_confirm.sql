-- Migration: Fix confirm_provisional_winners to cast horario_id

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
      -- CAST reserva.horario_id (text) to UUID
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
        reserva.horario_id::uuid, -- Explicit CAST to UUID
        reserva.data, 
        reserva.profissional_id, 
        reserva.turma_id,
        reserva.disciplina_id,
        now(), 
        'Confirmado automaticamente (Prioridade)'
      );
      
      -- Update status to confirmed
      UPDATE "PreReservas"
      SET status = 'confirmed' 
      WHERE id = reserva.id;

    EXCEPTION WHEN unique_violation THEN
      -- If already booked, mark as cancelled_conflict
      UPDATE "PreReservas" SET status = 'cancelled_conflict' WHERE id = reserva.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
