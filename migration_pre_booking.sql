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

-- 3. Function to calculate ranking score (Usage count in last 4 weeks FOR THE SPECIFIC RESOURCE)
CREATE OR REPLACE FUNCTION calculate_ranking_score(p_profissional_id uuid, p_target_date date, p_recurso_id uuid)
RETURNS bigint AS $$
DECLARE
  start_date date;
  end_date date;
  usage_count bigint;
BEGIN
  -- Window: [TargetDate - 28 days, TargetDate - 1 day]
  start_date := p_target_date - INTERVAL '28 days';
  end_date := p_target_date - INTERVAL '1 day';

  -- use UNION instead of UNION ALL to group same (data, horario_id)
  SELECT COUNT(*) INTO usage_count
  FROM (
    SELECT data, horario_id FROM "Agendamentos" 
    WHERE profissional_id = p_profissional_id 
    AND recurso_id = p_recurso_id
    AND data >= start_date AND data <= end_date
    
    UNION -- Automatically removes duplicates if same slot exists in both tables
    
    SELECT data, horario_id FROM "Cancelamentos"
    WHERE profissional_id = p_profissional_id
    AND recurso_id = p_recurso_id
    AND data >= start_date AND data <= end_date
  ) as unique_slots;

  RETURN usage_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get ranking for a specific slot (Updated to pass resource_id to score)
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
    calculate_ranking_score(pr.profissional_id, p_data, p_recurso_id) as score,
    pr.created_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        calculate_ranking_score(pr.profissional_id, p_data, p_recurso_id) ASC, -- Less usage first
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
  -- Wrap in block to catch FK violations during Cascade Delete
  BEGIN
    INSERT INTO "Cancelamentos" (recurso_id, horario_id, data, profissional_id, deleted_at, reason)
    VALUES (OLD.recurso_id, OLD.horario_id, OLD.data, OLD.profissional_id, now(), 'User cancelled');
  EXCEPTION WHEN foreign_key_violation THEN
    -- Fallback: Insert with NULL resource/prof if they are being deleted
    INSERT INTO "Cancelamentos" (recurso_id, horario_id, data, profissional_id, deleted_at, reason)
    VALUES (NULL, OLD.horario_id, OLD.data, OLD.profissional_id, now(), 'Cascade Delete');
  END;

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
