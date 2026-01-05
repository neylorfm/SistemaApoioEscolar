-- Fix RLS Policies for HorarioComplementar
-- This script removes restrictive policies and allows authenticated users to manage the table.

-- 1. Enable RLS (just in case)
ALTER TABLE "HorarioComplementar" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Auth All HorarioComplementar" ON "HorarioComplementar";
DROP POLICY IF EXISTS "Public Read HorarioComplementar" ON "HorarioComplementar";
DROP POLICY IF EXISTS "Enable read access for all users" ON "HorarioComplementar";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "HorarioComplementar";
DROP POLICY IF EXISTS "Enable update for users based on email" ON "HorarioComplementar";
DROP POLICY IF EXISTS "Enable delete for users based on email" ON "HorarioComplementar";

-- 3. Create permissive policies for Authenticated Users (Admins/Teachers)
-- Allow Authenticated users to Select, Insert, Update, Delete
CREATE POLICY "Auth All HorarioComplementar" 
ON "HorarioComplementar" 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. Allow Public Read (Optional, often needed for public schedules)
CREATE POLICY "Public Read HorarioComplementar" 
ON "HorarioComplementar" 
FOR SELECT 
USING (true);

-- Verify changes
SELECT * FROM pg_policies WHERE tablename = 'HorarioComplementar';
