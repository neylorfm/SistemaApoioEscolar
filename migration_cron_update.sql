-- Update Cron Schedules for Two-Phase Consolidation

-- 1. Helper function for 5AM Provisional Calculation
CREATE OR REPLACE FUNCTION auto_calc_provisional_next_week()
RETURNS void AS $$
DECLARE
  r RECORD;
  start_date DATE;
  end_date DATE;
  next_monday DATE;
BEGIN
  -- Next Monday logic
  next_monday := CURRENT_DATE + ((8 - EXTRACT(ISODOW FROM CURRENT_DATE))::integer % 7 + 1 )::integer;
  start_date := next_monday;
  end_date := start_date + 4; 
  
  FOR r IN SELECT id FROM "Recursos" WHERE active = true LOOP
    PERFORM calculate_provisional_winners(r.id, start_date, end_date);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Helper function for 12PM Confirmation
CREATE OR REPLACE FUNCTION auto_confirm_provisional_next_week()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM "Recursos" WHERE active = true LOOP
    PERFORM confirm_provisional_winners(r.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Schedule Jobs
-- Clear old jobs
SELECT cron.unschedule('consolidate_friday_5am');

-- Schedule 5AM Provisional
SELECT cron.schedule('provisional_friday_5am', '0 5 * * 5', 'SELECT auto_calc_provisional_next_week()');

-- Schedule 12PM Confirmation
SELECT cron.schedule('confirm_friday_12pm', '0 12 * * 5', 'SELECT auto_confirm_provisional_next_week()');
