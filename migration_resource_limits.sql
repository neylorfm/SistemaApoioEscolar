-- Add columns to Recursos
ALTER TABLE "Recursos"
ADD COLUMN IF NOT EXISTS "allowed_roles" text[] DEFAULT ARRAY['Administrador', 'Coordenador', 'Professor', 'Colaborador'],
ADD COLUMN IF NOT EXISTS "daily_limit" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "weekly_limit" integer DEFAULT 0;

-- Function to enforce limits
CREATE OR REPLACE FUNCTION check_resource_limits()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  daily_count integer;
  weekly_count integer;
  res_daily_limit integer;
  res_weekly_limit integer;
  res_allowed_roles text[];
BEGIN
  -- 1. Get User Role
  SELECT tipo INTO user_role FROM "Profissionais" WHERE id = NEW.profissional_id;
  
  -- If user not found (unlikely), allow or block? Block implies security.
  IF user_role IS NULL THEN
     RAISE EXCEPTION 'Usuario nao encontrado.';
  END IF;

  -- 2. Bypass Limit Checks for Admins/Coordinators
  IF user_role IN ('Administrador', 'Coordenador') THEN
     RETURN NEW;
  END IF;

  -- 3. Get Resource Settings
  SELECT daily_limit, weekly_limit, allowed_roles 
  INTO res_daily_limit, res_weekly_limit, res_allowed_roles
  FROM "Recursos" WHERE id = NEW.recurso_id;

  -- 4. Role Permission Check
  IF res_allowed_roles IS NOT NULL AND NOT (user_role = ANY(res_allowed_roles)) THEN
     RAISE EXCEPTION 'Seu perfil (%) não tem permissão para agendar este recurso.', user_role;
  END IF;

  -- 5. Daily Limit Check
  IF res_daily_limit > 0 THEN
      SELECT COUNT(*) INTO daily_count 
      FROM "Agendamentos" 
      WHERE recurso_id = NEW.recurso_id 
      AND profissional_id = NEW.profissional_id 
      AND data = NEW.data;
      
      IF daily_count >= res_daily_limit THEN
           RAISE EXCEPTION 'Limite diário de agendamentos excedido para este recurso (% por dia). Solicite ao coordenador.', res_daily_limit;
      END IF;
  END IF;

  -- 6. Weekly Limit Check
  IF res_weekly_limit > 0 THEN
      SELECT COUNT(*) INTO weekly_count 
      FROM "Agendamentos" 
      WHERE recurso_id = NEW.recurso_id 
      AND profissional_id = NEW.profissional_id 
      AND date_trunc('week', data) = date_trunc('week', NEW.data::date);
      
      IF weekly_count >= res_weekly_limit THEN
           RAISE EXCEPTION 'Limite semanal de agendamentos excedido para este recurso (% por semana). Solicite ao coordenador.', res_weekly_limit;
      END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS enforce_resource_limits ON "Agendamentos";
CREATE TRIGGER enforce_resource_limits
BEFORE INSERT ON "Agendamentos"
FOR EACH ROW
EXECUTE FUNCTION check_resource_limits();
