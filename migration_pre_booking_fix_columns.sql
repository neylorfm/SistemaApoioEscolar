
-- Migration to add missing columns to PreReservas table
-- These are required by the frontend logic

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PreReservas' AND column_name='turma_id') THEN
        ALTER TABLE "PreReservas" ADD COLUMN "turma_id" uuid REFERENCES "Turmas"(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PreReservas' AND column_name='disciplina_id') THEN
        ALTER TABLE "PreReservas" ADD COLUMN "disciplina_id" uuid REFERENCES "Disciplinas"(id) ON DELETE SET NULL;
    END IF;
END $$;
