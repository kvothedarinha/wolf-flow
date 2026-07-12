
-- Track Flow: substitui o schema do Creator Hub por acompanhamento de hábitos

-- Remove o app antigo
DROP TABLE IF EXISTS public.metrics_reports;
DROP TABLE IF EXISTS public.deliverables;
DROP TABLE IF EXISTS public.campaigns;
DROP TABLE IF EXISTS public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP TYPE IF EXISTS public.app_role;

-- Perfil simplificado: sem mídia kit / redes sociais
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS instagram_handle,
  DROP COLUMN IF EXISTS tiktok_handle,
  DROP COLUMN IF EXISTS youtube_handle;

-- Perfis deixam de ser públicos: cada usuário lê apenas o próprio
DROP POLICY IF EXISTS "Profiles publicly readable" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Signup passa a criar apenas o profile (sem roles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;

-- Hábitos
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'check',
  color TEXT NOT NULL DEFAULT '#6366f1',
  -- daily: segue os dias marcados em weekdays; weekly: meta livre de X check-ins na semana
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  weekdays SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0 = domingo
  target_per_week SMALLINT NOT NULL DEFAULT 3 CHECK (target_per_week BETWEEN 1 AND 7),
  group_name TEXT, -- agrupamento livre na tela Hoje (ex.: Manhã, Saúde)
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Check-ins: no máximo um por hábito por dia
CREATE TABLE public.habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, entry_date)
);

CREATE INDEX habit_entries_user_date_idx ON public.habit_entries (user_id, entry_date);
CREATE INDEX habits_user_idx ON public.habits (user_id);

CREATE TRIGGER habits_updated BEFORE UPDATE ON public.habits
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS: dados de hábitos são estritamente do dono
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habits" ON public.habits FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own entries" ON public.habit_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
