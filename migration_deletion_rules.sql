
-- Migration: Booking Deletion Rules
-- 1. Create a helper function to get start time from Horarios (Bypassing RLS)
-- 2. Create a Trigger on Agendamentos to block deletion based on time.

-- Function to get start_time by ID (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION get_horario_start_time(p_horario_id uuid)
RETURNS time AS $$
DECLARE
  v_start_time time;
BEGIN
  SELECT start_time INTO v_start_time
  FROM "Horarios"
  WHERE id = p_horario_id;
  
  RETURN v_start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to check deletion rules
CREATE OR REPLACE FUNCTION check_deletion_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_start_time time;
  v_booking_ts timestamp;
  v_now timestamp;
  v_deadline timestamp;
  v_user_role text;
BEGIN
  -- 0. Bypass for Admin/Coordinator (Allow cleanup of past/recent bookings)
  -- Uses SECURITY DEFINER to ensure we can read Profissionais regardless of RLS
  SELECT tipo INTO v_user_role FROM "Profissionais" WHERE id = auth.uid();
  
  IF v_user_role IN ('Administrador', 'Coordenador') THEN
     RETURN OLD;
  END IF;

  -- 1. Fetch Start Time
  v_start_time := get_horario_start_time(OLD.horario_id);
  
  IF v_start_time IS NULL THEN
     RETURN OLD;
  END IF;

  -- Get Current Time in Brasilia (Timestamp without Time Zone)
  v_now := timezone('America/Sao_Paulo', now()::timestamptz);
  
  -- Construct Booking Timestamp (Data + StartTime) 
  v_booking_ts := (OLD.data || ' ' || v_start_time)::timestamp;
  
  -- Logic 1: "Anteriores ao dia atual" (Past Days)
  IF OLD.data < (v_now::date) THEN
    -- Include Debug Info in Error Message
    RAISE EXCEPTION 'Não é permitido excluir agendamentos de dias anteriores. (Role: %, UID: %)', v_user_role, auth.uid();
  END IF;
  
  -- Logic 2: "Até 2 horas antes da hora atual" (2 Hour Notice)
  v_deadline := v_booking_ts - INTERVAL '2 hours';
  
  IF v_now > v_deadline THEN
     RAISE EXCEPTION 'Não é permitido excluir agendamentos imediato/passado. (Role: %, UID: %)', v_user_role, auth.uid();
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS trigger_check_deletion ON "Agendamentos";
CREATE TRIGGER trigger_check_deletion
BEFORE DELETE ON "Agendamentos"
FOR EACH ROW
EXECUTE FUNCTION check_deletion_rules();
