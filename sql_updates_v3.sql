-- ============================================
-- PlanTracker v3 - SQL Updates
-- Rulează în Supabase SQL Editor
-- ============================================

-- 1. Tabel setări aplicație (logo, etc)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_select" ON public.app_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "app_settings_admin" ON public.app_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Tabel liste dropdown configurabile
CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_name TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_name, value)
);
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "list_items_select" ON public.list_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "list_items_admin" ON public.list_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Populare liste cu valorile default
INSERT INTO public.list_items (list_name, value, order_index) VALUES
  ('floor','BO',1),('floor','KG',2),('floor','EG',3),('floor','1.OG',4),('floor','2.OG',5),
  ('floor','3.OG',6),('floor','4.OG',7),('floor','5.OG',8),('floor','6.OG',9),
  ('floor','7.OG',10),('floor','8.OG',11),('floor','9.OG',12),('floor','SG',13),('floor','DG',14),('floor','-',15),
  ('tip_plan','NOU',1),('tip_plan','C_DE',2),('tip_plan','C_LMT',3),
  ('tip_plan','FREI',4),('tip_plan','NTR',5),('tip_plan','MKT',6),('tip_plan','MKT_45',7),('tip_plan','-',8),
  ('sch_bew_gen','SCH',1),('sch_bew_gen','BEW',2),('sch_bew_gen','GENERALITATI',3),
  ('status','IN_LUCRU',1),('status','PAUZA',2),('status','TERMINAT',3)
ON CONFLICT DO NOTHING;

-- 4. Storage bucket pentru logo (rulează separat în Storage → Create bucket)
-- Bucket name: app-assets, Public: YES

-- 5. Funcție pentru schimbarea parolei (opțional, necesită service_role)
-- Alternativ: schimbă parola direct din Supabase Dashboard → Authentication → Users
