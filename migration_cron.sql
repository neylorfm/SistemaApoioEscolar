-- Enable the pg_cron extension (only works on some Supabase plans, but standard practice)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Function to consolidate ALL resources for the "Next Week" automatically
CREATE OR REPLACE FUNCTION auto_consolidate_next_week()
RETURNS void AS $$
DECLARE
  r RECORD;
  start_date DATE;
  end_date DATE;
  next_monday DATE;
BEGIN
  -- Logic: Next Week relative to Current Date
  -- If today is Friday (dow 5), next Monday is +3 days.
  -- But to be safe, let's find the *upcoming* Monday.
  
  -- Method: Find next Monday from CURRENT_DATE
  -- (ISODOW: Mon=1 ... Sun=7)
  
  -- If today is Friday (5), we want next Monday (+3 days).
  -- If today is Monday (1), we want next Monday (+7 days).
  
  -- General formula for "Next Monday":
  -- (8 - EXTRACT(ISODOW FROM CURRENT_DATE))::int + CURRENT_DATE
  -- However, if today is Monday, this gives Next Monday (+7). Correct.
  
  next_monday := CURRENT_DATE + ((8 - EXTRACT(ISODOW FROM CURRENT_DATE))::integer % 7 + 1 )::integer;
  
  -- Wait, if today is Friday (5): 8-5=3. Today+3 = Monday. Correct.
  -- If today is Sunday (7): 8-7=1. Today+1 = Monday. Correct.
  
  -- Let's set the target week range
  start_date := next_monday;
  end_date := start_date + 4; -- Monday to Friday inclusive
  
  -- Loop active resources
  FOR r IN SELECT id FROM "Recursos" WHERE active = true LOOP
    -- Call the single consolidation function
    PERFORM consolidate_schedule(r.id, start_date, end_date);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule it: Every Friday at 05:00 AM
-- Cron syntax: '0 5 * * 5'
-- param1: job_name, param2: schedule, param3: command
SELECT cron.schedule('consolidate_friday_5am', '0 5 * * 5', 'SELECT auto_consolidate_next_week()');
