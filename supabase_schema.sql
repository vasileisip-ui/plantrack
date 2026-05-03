-- ============================================
-- PLANTRACKER - Schema Supabase
-- Rulează acest SQL în Supabase SQL Editor
-- ============================================

-- 1. UTILIZATORI (extinde auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROIECTE
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  client TEXT,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 3. BAUTEILE (sub-componente ale proiectelor)
CREATE TABLE public.bauteile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ATRIBUIRE PROIECTE -> UTILIZATORI
CREATE TABLE public.user_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, project_id)
);

-- 5. TASKURI (intrări zilnice - echivalentul rândurilor din Excel)
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  bauteil_id UUID REFERENCES public.bauteile(id) ON DELETE SET NULL,
  
  -- Date task
  task_date DATE NOT NULL,
  month TEXT GENERATED ALWAYS AS (TO_CHAR(task_date, 'YYYY-MM')) STORED,
  task_number INTEGER NOT NULL,
  
  -- Clasificare plan
  sch_bew_gen TEXT CHECK (sch_bew_gen IN ('SCH', 'BEW', 'GENERALITATI')),
  plan_number TEXT,
  floor TEXT, -- etaj: BO, KG, EG, OG1, etc.
  plan_description TEXT,
  
  -- Status & Tip
  status TEXT DEFAULT 'IN_LUCRU' CHECK (status IN ('IN_LUCRU', 'PAUZA', 'TERMINAT')),
  tip_plan TEXT CHECK (tip_plan IN ('NOU', 'C_DE', 'C_LMT', 'FREI', 'NTR', 'MKT')),
  
  -- Timp
  time_start TIME,
  time_pause TIME,
  time_end TIME,
  hours_worked NUMERIC(5,2), -- ore calculate
  
  -- Extra
  correction_date DATE,
  verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ZILE LIBERE / SARBATORI
CREATE TABLE public.holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM holiday_date)::INTEGER) STORED
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bauteile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Profiles: fiecare vede profilul propriu, admin vede tot
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Proiecte: toți utilizatorii autentificați văd proiectele active
CREATE POLICY "projects_select" ON public.projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "projects_insert_admin" ON public.projects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "projects_update_admin" ON public.projects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Bauteile
CREATE POLICY "bauteile_select" ON public.bauteile FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "bauteile_insert_admin" ON public.bauteile FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "bauteile_update_admin" ON public.bauteile FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "bauteile_delete_admin" ON public.bauteile FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- User Projects
CREATE POLICY "user_projects_select" ON public.user_projects FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "user_projects_admin" ON public.user_projects FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tasks: utilizatorul vede doar ale lui, admin vede tot
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Holidays: toți văd, admin modifică
CREATE POLICY "holidays_select" ON public.holidays FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "holidays_admin" ON public.holidays FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- FUNCȚII & TRIGGERE
-- ============================================

-- Auto-create profile la signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- DATE INITIALE - Sarbatori Romania 2026
-- ============================================
INSERT INTO public.holidays (holiday_date, name) VALUES
  ('2026-01-01', 'Anul Nou'),
  ('2026-01-02', 'Anul Nou (zi 2)'),
  ('2026-01-24', 'Ziua Unirii'),
  ('2026-04-10', 'Vinerea Mare'),
  ('2026-04-12', 'Paști'),
  ('2026-04-13', 'Paști (zi 2)'),
  ('2026-05-01', 'Ziua Muncii'),
  ('2026-06-01', 'Ziua Copilului'),
  ('2026-06-08', 'Rusalii (Luni)'),
  ('2026-08-15', 'Adormirea Maicii Domnului'),
  ('2026-11-30', 'Sf. Andrei'),
  ('2026-12-01', 'Ziua Națională'),
  ('2026-12-25', 'Crăciun'),
  ('2026-12-26', 'Crăciun (zi 2)')
ON CONFLICT DO NOTHING;

-- BENEFICIARI (pentru fix 4)
-- Rulează acest SQL separat în Supabase SQL Editor:
/*
CREATE TABLE public.beneficiaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beneficiaries_select" ON public.beneficiaries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "beneficiaries_admin" ON public.beneficiaries FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
*/
