
-- Track Flow: schema completo do app de hábitos (migration única, self-contained)

-- ─── Funções utilitárias ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ─── Profiles ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Trigger de signup: cria profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Hábitos ──────────────────────────────────────────────────────────────

CREATE TABLE public.habits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  icon           TEXT NOT NULL DEFAULT 'check',
  color          TEXT NOT NULL DEFAULT '#6366f1',
  -- build: construir um hábito (check-in = sucesso); quit: largar (check-in = recaída)
  kind           TEXT NOT NULL DEFAULT 'build' CHECK (kind IN ('build', 'quit')),
  -- daily: segue weekdays; weekly: meta livre de X check-ins na semana
  frequency      TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  weekdays       SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  target_per_week SMALLINT NOT NULL DEFAULT 3 CHECK (target_per_week BETWEEN 1 AND 7),
  group_name     TEXT,
  auto_source    TEXT CHECK (auto_source IN ('strava')),
  archived       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX habits_user_idx ON public.habits (user_id);

CREATE TRIGGER habits_updated BEFORE UPDATE ON public.habits
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habits" ON public.habits FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Check-ins ────────────────────────────────────────────────────────────

CREATE TABLE public.habit_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id   UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, entry_date)
);

CREATE INDEX habit_entries_user_date_idx ON public.habit_entries (user_id, entry_date);

ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own entries" ON public.habit_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Integração Strava ────────────────────────────────────────────────────

CREATE TABLE public.strava_connections (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id    BIGINT NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER strava_connections_updated BEFORE UPDATE ON public.strava_connections
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own strava connection"   ON public.strava_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users delete own strava connection" ON public.strava_connections FOR DELETE USING (auth.uid() = user_id);

-- Estados temporários do OAuth (somente service role; sem policies de leitura pública)
CREATE TABLE public.strava_oauth_states (
  state      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strava_oauth_states ENABLE ROW LEVEL SECURITY;

-- ─── Dispositivos (relógio Zepp / atalhos) ────────────────────────────────

CREATE TABLE public.device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Relógio',
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own device tokens"  ON public.device_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users revoke own device tokens" ON public.device_tokens FOR DELETE USING (auth.uid() = user_id);

-- Códigos curtos de pareamento (app web insere; Edge Function consome e apaga)
CREATE TABLE public.watch_pair_codes (
  code       TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_pair_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own pair codes" ON public.watch_pair_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own pair codes"   ON public.watch_pair_codes FOR SELECT USING (auth.uid() = user_id);
