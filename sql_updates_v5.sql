-- ============================================
-- PlanTracker v5 - SQL Updates
-- Rulează în Supabase SQL Editor
-- ============================================

-- 1. Tabel comentarii pe taskuri
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.task_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "comments_insert" ON public.task_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update" ON public.task_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "comments_delete" ON public.task_comments FOR DELETE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Tabel istoric modificări taskuri
CREATE TABLE IF NOT EXISTS public.task_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_select" ON public.task_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "history_insert" ON public.task_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Extinde app_settings (deja există, adaugă emailul admin)
INSERT INTO public.app_settings (key, value) VALUES
  ('admin_email', 'vasile.isip@lmt-ingenieure.ro'),
  ('monthly_report_enabled', 'true'),
  ('company_name', 'LMT Ingenieure')
ON CONFLICT (key) DO NOTHING;

-- 4. Index pentru performanță
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, task_date);
