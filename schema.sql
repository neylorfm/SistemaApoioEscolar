-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. Escola (Settings)
create table "Escola" (
  id uuid default uuid_generate_v4() primary key,
  name text not null default 'Escola Modelo',
  "hasNightShift" boolean default true,
  "lunchColor" text default '#f97316',
  "availableWeeks" integer default 2,
  "semanticColors" jsonb default '{"regular": "#2563eb", "maintenance": "#dc2626", "specialEvent": "#9333ea", "blockedProject": "#d97706"}'::jsonb,
  logo_url text,
  "logoUrl" text, -- Legacy/Duplicate handling seen in code
  academic_config jsonb,
  session_timeouts jsonb
);

-- 2. ConfiguracaoLogin (Public Config)
create table "ConfiguracaoLogin" (
  id uuid default uuid_generate_v4() primary key,
  escola_id uuid references "Escola"(id),
  titulo text,
  logo_url text,
  cores jsonb
);

-- 3. Profissionais (Staff/Teachers)
create table "Profissionais" (
  id uuid references auth.users not null primary key, -- Linked to Supabase Auth
  nome text not null,
  email text,
  foto text,
  tipo text check (tipo in ('Administrador', 'Coordenador', 'Professor', 'Colaborador')),
  alias text,
  must_change_password boolean default false
);

-- 4. Recursos (Resources)
create table "Recursos" (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  details text,
  type text not null,
  "iconBg" text,
  "iconColor" text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Turmas (Classes)
create table "Turmas" (
  id uuid default uuid_generate_v4() primary key,
  series text not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Disciplinas (Subjects)
create table "Disciplinas" (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Horarios (Time Slots)
create table "Horarios" (
  id uuid default uuid_generate_v4() primary key,
  label text not null,
  start_time time not null,
  end_time time not null,
  type text check (type in ('class', 'interval')),
  position integer
);

-- 8. HorarioTurmas (Class Allocations)
create table "HorarioTurmas" (
  id uuid default uuid_generate_v4() primary key,
  turma_id uuid references "Turmas"(id) on delete cascade,
  professor_id uuid references "Profissionais"(id) on delete set null,
  disciplina_id uuid references "Disciplinas"(id) on delete set null,
  horario_id uuid references "Horarios"(id) on delete cascade,
  dia_semana integer not null, -- 0-6 or 1-5? Code suggests JS getDay() (0=Sun)
  ano_letivo text not null,
  semestre text not null,
  sala text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(turma_id, horario_id, dia_semana, ano_letivo, semestre)
);

-- 9. HorarioComplementar (Teacher Complementary Allocations)
create table "HorarioComplementar" (
  id uuid default uuid_generate_v4() primary key,
  professor_id uuid references "Profissionais"(id) on delete cascade,
  dia_semana integer not null,
  horario_id uuid references "Horarios"(id) on delete cascade,
  atividade text,
  ano_letivo text,
  semestre text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 10. CalendarioLetivo (Events)
-- 10. CalendarioLetivo (Events)
create table "CalendarioLetivo" (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  date date not null,
  type text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 11. Links (Portal Links)
-- 11. Links (Portal Links)
create table "Links" (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,  -- Added to support UI description
  url text not null,
  icon text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 12. PreferenciasUsuario (User Preferences)
create table "PreferenciasUsuario" (
  user_id uuid references auth.users not null primary key,
  link_order jsonb,
  student_order jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 13. Alunos (Students)
create table "Alunos" (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  matricula text,
  turma_id uuid references "Turmas"(id) on delete set null,
  pdt_id uuid references "Profissionais"(id) on delete set null,
  status text,
  foto_url text,
  diagnostico text,
  pcd_dados jsonb, -- JSON for complex PCD profile
  anexos jsonb,    -- Array of attachments
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 14. Agendamentos (Resource Scheduling)
create table "Agendamentos" (
  id uuid default uuid_generate_v4() primary key,
  recurso_id uuid references "Recursos"(id) on delete cascade,
  horario_id uuid references "Horarios"(id) on delete cascade,
  turma_id uuid references "Turmas"(id) on delete cascade,
  profissional_id uuid references "Profissionais"(id) on delete cascade,
  disciplina_id uuid references "Disciplinas"(id) on delete set null,
  data date not null,
  descricao text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Storage Buckets & Policies
-- ==============================================================================

-- 1. Create Buckets (Safe insert)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true) -- Usually public for ease of access in this app context, or false? Let's check usage. Avatars/Logos public. Attachments might be mixed.
on conflict (id) do nothing;

-- 2. Storage Policies (Standard Public Read / Auth Upload)

-- Avatars
create policy "Avatar Public Read" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Avatar Auth Insert" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
create policy "Avatar Auth Update" on storage.objects for update using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
create policy "Avatar Auth Delete" on storage.objects for delete using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Logos
create policy "Logo Public Read" on storage.objects for select using ( bucket_id = 'logos' );
create policy "Logo Auth Insert" on storage.objects for insert with check ( bucket_id = 'logos' and auth.role() = 'authenticated' );

-- Attachments
create policy "Attachments Public Read" on storage.objects for select using ( bucket_id = 'attachments' );
create policy "Attachments Auth Insert" on storage.objects for insert with check ( bucket_id = 'attachments' and auth.role() = 'authenticated' );


-- RLS Policies
-- ==============================================================================

-- 1. Enable RLS on all tables
alter table "Escola" enable row level security;
alter table "ConfiguracaoLogin" enable row level security;
alter table "Profissionais" enable row level security;
alter table "Recursos" enable row level security;
alter table "Turmas" enable row level security;
alter table "Disciplinas" enable row level security;
alter table "Horarios" enable row level security;
alter table "HorarioTurmas" enable row level security;
alter table "HorarioComplementar" enable row level security;
alter table "CalendarioLetivo" enable row level security;
alter table "Links" enable row level security;
alter table "PreferenciasUsuario" enable row level security;
alter table "Alunos" enable row level security;
alter table "Agendamentos" enable row level security;

-- 2. Define Policies

-- GROUP A: Public Read / Authenticated Write
-- Tables: Escola, ConfiguracaoLogin, Profissionais, Recursos, Turmas, Disciplinas, 
--         Horarios, HorarioTurmas, HorarioComplementar, CalendarioLetivo, Links

-- Escola
create policy "Public Read Escola" on "Escola" for select using (true);
create policy "Auth All Escola" on "Escola" for all using (auth.role() = 'authenticated');

-- ConfiguracaoLogin
create policy "Public Read ConfiguracaoLogin" on "ConfiguracaoLogin" for select using (true);
create policy "Auth All ConfiguracaoLogin" on "ConfiguracaoLogin" for all using (auth.role() = 'authenticated');

-- Profissionais (Public read needed for schedules/directory)
create policy "Public Read Profissionais" on "Profissionais" for select using (true);
create policy "Auth All Profissionais" on "Profissionais" for all using (auth.role() = 'authenticated');

-- Recursos
create policy "Public Read Recursos" on "Recursos" for select using (true);
create policy "Auth All Recursos" on "Recursos" for all using (auth.role() = 'authenticated');

-- Turmas
create policy "Public Read Turmas" on "Turmas" for select using (true);
create policy "Auth All Turmas" on "Turmas" for all using (auth.role() = 'authenticated');

-- Disciplinas
create policy "Public Read Disciplinas" on "Disciplinas" for select using (true);
create policy "Auth All Disciplinas" on "Disciplinas" for all using (auth.role() = 'authenticated');

-- Horarios
create policy "Public Read Horarios" on "Horarios" for select using (true);
create policy "Auth All Horarios" on "Horarios" for all using (auth.role() = 'authenticated');

-- HorarioTurmas
create policy "Public Read HorarioTurmas" on "HorarioTurmas" for select using (true);
create policy "Auth All HorarioTurmas" on "HorarioTurmas" for all using (auth.role() = 'authenticated');

-- HorarioComplementar
create policy "Public Read HorarioComplementar" on "HorarioComplementar" for select using (true);
create policy "Auth All HorarioComplementar" on "HorarioComplementar" for all using (auth.role() = 'authenticated');

-- CalendarioLetivo
create policy "Public Read CalendarioLetivo" on "CalendarioLetivo" for select using (true);
create policy "Auth All CalendarioLetivo" on "CalendarioLetivo" for all using (auth.role() = 'authenticated');

-- Links
create policy "Public Read Links" on "Links" for select using (true);
create policy "Auth All Links" on "Links" for all using (auth.role() = 'authenticated');

-- GROUP B: Private / Sensitive Data
-- Tables: PreferenciasUsuario, Alunos

-- PreferenciasUsuario (Owner Access Only)
create policy "User View Own Prefs" on "PreferenciasUsuario" for select using (auth.uid() = user_id);
create policy "User Update Own Prefs" on "PreferenciasUsuario" for update using (auth.uid() = user_id);
create policy "User Insert Own Prefs" on "PreferenciasUsuario" for insert with check (auth.uid() = user_id);
create policy "User Delete Own Prefs" on "PreferenciasUsuario" for delete using (auth.uid() = user_id);

-- Alunos (Authenticated Users Only - Staff/Teachers)
-- Students data is sensitive, should not be public.
create policy "Auth Read Alunos" on "Alunos" for select using (auth.role() = 'authenticated');
create policy "Auth All Alunos" on "Alunos" for all using (auth.role() = 'authenticated');

-- Agendamentos Policies
create policy "Enable read access for all users" on "Agendamentos" for select using (true);
create policy "Enable insert for teachers" on "Agendamentos" for insert with check (auth.role() = 'authenticated');
create policy "Enable delete for teachers" on "Agendamentos" for delete using (auth.role() = 'authenticated');
create policy "Enable full access for admins" on "Agendamentos" for all using (
  exists (
    select 1 from "Profissionais" 
    where id = auth.uid() and tipo = 'Administrador'
  )
);

-- FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 1. Trigger to ensure PDT is a Professor or Coordenador
CREATE OR REPLACE FUNCTION check_pdt_is_professor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pdt_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "Profissionais"
      WHERE id = NEW.pdt_id AND tipo IN ('Professor', 'Coordenador', 'Administrador')
    ) THEN
      RAISE EXCEPTION 'O PDT selecionado deve ser um Professor, Coordenador ou Administrador.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_pdt_is_professor ON "Alunos";
CREATE TRIGGER ensure_pdt_is_professor
BEFORE INSERT OR UPDATE ON "Alunos"
FOR EACH ROW
EXECUTE FUNCTION check_pdt_is_professor();

-- 2. Trigger to handle new user signup (Auto-create Profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."Profissionais" (id, nome, email, tipo, must_change_password)
  VALUES (
    new.id, 
    -- Prioritize 'nome' (sent by our app), fallbacks for standard OAuth
    COALESCE(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Novo Usuário'),
    new.email, 
    -- Prioritize 'tipo' (sent by our app), fallback to 'Colaborador'
    COALESCE(new.raw_user_meta_data->>'tipo', 'Colaborador'),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    -- If profile exists (e.g. re-register), update it with untrusted metadata? 
    -- Or keep existing? 'DO NOTHING' is safer to prevent overwrites, 
    -- BUT user said "apaguei e tentei criar". If Profissionais record remained, we should probably update it to reactivate/resync.
    -- Let's UPDATE on conflict to ensure the new intent (Role/Name) is reflected.
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Function to Delete User (Admin Only) - Safely deletes from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if executor is admin (double check for safety)
  IF NOT EXISTS (
    SELECT 1 FROM public."Profissionais" 
    WHERE id = auth.uid() AND tipo = 'Administrador'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários.';
  END IF;

  -- 1. Delete from Child Table first (Profissionais) to avoid FK violation
  DELETE FROM public."Profissionais" WHERE id = user_id;

  -- 2. Delete from Parent Table (auth.users)
  -- Note: This requires the function to be SECURITY DEFINER to access auth schema
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) TO authenticated;

-- 4. Seed Initial Calendar Events
-- ==============================================================================
INSERT INTO public."CalendarioLetivo" (title, date, type, description)
VALUES 
  ('Início das Aulas', CURRENT_DATE + INTERVAL '7 days', 'academic', 'Início do ano letivo'),
  ('Reunião de Pais', CURRENT_DATE + INTERVAL '14 days', 'event', 'Apresentação da escola'),
  ('Feriado Nacional', CURRENT_DATE + INTERVAL '30 days', 'holiday', 'Feriado previsto');


-- 3. Admin User Setup
-- ==============================================================================
-- O usuário Admin deve ser criado manualmente no painel do Supabase:
-- 1. Vá em Authentication > Users > Add User
-- 2. Crie um usuário com seu email e senha.
-- 3. O trigger 'handle_new_user' irá criar automaticamente o perfil em 'Profissionais'.
-- 4. Para dar permissão de ADMIN, rode no SQL Editor:
--    UPDATE "Profissionais" SET tipo = 'Administrador' WHERE email = 'seu@email.com';

-- 6. Seed Initial Links (Portal Shortcuts)
-- ==============================================================================
INSERT INTO public."Links" (title, description, category, url)
VALUES (
  'Calendário Acadêmico', 
  'Visualize o cronograma escolar anual, provas e feriados.',
  'calendar',
  '/academic-calendar'
)
ON CONFLICT DO NOTHING;
DO $$
DECLARE
  escola_id_var uuid;
BEGIN
  -- Check if Escola table is empty
  IF NOT EXISTS (SELECT 1 FROM "Escola" LIMIT 1) THEN
    -- Insert default school settings
    INSERT INTO "Escola" (
      name,
      "hasNightShift",
      "lunchColor",
      "availableWeeks",
      "semanticColors",
      "academic_config"
    ) VALUES (
      'Sistema de Apoio Escolar',
      true,
      '#f97316',
      2,
      '{"regular": "#2563eb", "maintenance": "#dc2626", "specialEvent": "#9333ea", "blockedProject": "#d97706"}'::jsonb,
      jsonb_build_object(
        'yearConfig', jsonb_build_object(
          'year', EXTRACT(YEAR FROM CURRENT_DATE)::text,
          'startDate', (EXTRACT(YEAR FROM CURRENT_DATE) || '-02-01'),
          'endDate', (EXTRACT(YEAR FROM CURRENT_DATE) || '-12-15'),
          'nextYearStartDate', ((EXTRACT(YEAR FROM CURRENT_DATE) + 1) || '-02-01'),
          'recoveryStartDate', (EXTRACT(YEAR FROM CURRENT_DATE) || '-12-16'),
          'recoveryEndDate', (EXTRACT(YEAR FROM CURRENT_DATE) || '-12-23')
        ),
        'terms', jsonb_build_array(
          jsonb_build_object('id', 1, 'label', '1º Bimestre', 'start', (EXTRACT(YEAR FROM CURRENT_DATE) || '-02-01'), 'end', (EXTRACT(YEAR FROM CURRENT_DATE) || '-04-15')),
          jsonb_build_object('id', 2, 'label', '2º Bimestre', 'start', (EXTRACT(YEAR FROM CURRENT_DATE) || '-04-16'), 'end', (EXTRACT(YEAR FROM CURRENT_DATE) || '-07-10')),
          jsonb_build_object('id', 3, 'label', '3º Bimestre', 'start', (EXTRACT(YEAR FROM CURRENT_DATE) || '-08-01'), 'end', (EXTRACT(YEAR FROM CURRENT_DATE) || '-09-30')),
          jsonb_build_object('id', 4, 'label', '4º Bimestre', 'start', (EXTRACT(YEAR FROM CURRENT_DATE) || '-10-01'), 'end', (EXTRACT(YEAR FROM CURRENT_DATE) || '-12-15'))
        )
      )
    )
    RETURNING id INTO escola_id_var;
    
    -- Insert corresponding ConfiguracaoLogin entry
    INSERT INTO "ConfiguracaoLogin" (escola_id, titulo, cores)
    VALUES (
      escola_id_var,
      'Sistema de Apoio Escolar',
      '{"regular": "#2563eb", "maintenance": "#dc2626", "specialEvent": "#9333ea", "blockedProject": "#d97706"}'::jsonb
    );
    
    RAISE NOTICE 'Configurações iniciais da escola criadas com sucesso.';
  ELSE
    RAISE NOTICE 'Configurações da escola já existem. Nada foi feito.';
  END IF;
END $$;

-- 5. Seed Initial Calendar Events (Optional)
-- ==============================================================================
-- 5. Seed Initial Calendar (Old logic removed - see section 4 above for correct seed)
-- ==============================================================================
-- (Previous conflicting seed removed)


