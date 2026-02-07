-- 1. Create PreReservas table
CREATE TABLE IF NOT EXISTS "PreReservas" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recurso_id uuid REFERENCES "Recursos"(id) ON DELETE CASCADE,
  horario_id text NOT NULL,
  data date NOT NULL,
  profissional_id uuid REFERENCES "Profissionais"(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending', -- pending, won, lost, cancelled
  UNIQUE(recurso_id, horario_id, data, profissional_id)
);

-- 2. Create Cancelamentos table for audit and ranking
CREATE TABLE IF NOT EXISTS "Cancelamentos" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recurso_id uuid REFERENCES "Recursos"(id) ON DELETE SET NULL,
  horario_id text NOT NULL,
  data date NOT NULL,
  profissional_id uuid REFERENCES "Profissionais"(id) ON DELETE SET NULL,
  deleted_at timestamptz DEFAULT now(),
  reason text
);

-- 3. Function to calculate ranking score (Usage count in last 4 weeks)
CREATE OR REPLACE FUNCTION calculate_ranking_score(p_profissional_id uuid, p_target_date date)
RETURNS bigint AS $$
DECLARE
  start_date date;
  end_date date;
  usage_count bigint;
BEGIN
  -- 4 weeks before the *target week* (or just today? Requirements say "dias quatro semanas anterior a semana da reserva")
  -- "Conte as aulas usadas nos dias quatro semanas anterior a semana da reserva"
  -- Let's define the window as: [TargetDate - 28 days, TargetDate - 1 day]
  start_date := p_target_date - INTERVAL '28 days';
  end_date := p_target_date - INTERVAL '1 day';

  SELECT COUNT(*) INTO usage_count
  FROM (
    SELECT id FROM "Agendamentos" 
    WHERE profissional_id = p_profissional_id 
    AND data >= start_date AND data <= end_date
    
    UNION ALL
    
    SELECT id FROM "Cancelamentos"
    WHERE profissional_id = p_profissional_id
    AND data >= start_date AND data <= end_date
  ) as combined_usage;

  RETURN usage_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get ranking for a specific slot
-- Returns the list of interested professionals ordered by Score ASC (Less usage is better), then CreatedAt ASC (First come)
CREATE OR REPLACE FUNCTION get_slot_ranking(p_recurso_id uuid, p_data date, p_horario_id text)
RETURNS TABLE (
  profissional_id uuid,
  nome text,
  alias text,
  score bigint,
  created_at timestamptz,
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.profissional_id,
    p.nome,
    p.alias,
    calculate_ranking_score(pr.profissional_id, p_data) as score,
    pr.created_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        calculate_ranking_score(pr.profissional_id, p_data) ASC, -- Less usage first
        pr.created_at ASC -- First come first served tie-breaker
    ) as rank
  FROM "PreReservas" pr
  JOIN "Profissionais" p ON pr.profissional_id = p.id
  WHERE pr.recurso_id = p_recurso_id
  AND pr.data = p_data
  AND pr.horario_id = p_horario_id
  AND pr.status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to log cancellations
CREATE OR REPLACE FUNCTION log_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "Cancelamentos" (recurso_id, horario_id, data, profissional_id, deleted_at, reason)
  VALUES (OLD.recurso_id, OLD.horario_id, OLD.data, OLD.profissional_id, now(), 'User cancelled');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_agendamento_delete ON "Agendamentos";
CREATE TRIGGER log_agendamento_delete
BEFORE DELETE ON "Agendamentos"
FOR EACH ROW
EXECUTE FUNCTION log_cancellation();

-- 6. Grant permissions
GRANT ALL ON "PreReservas" TO anon, authenticated, service_role;
GRANT ALL ON "Cancelamentos" TO anon, authenticated, service_role;
