
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('agency', 'creator');

-- Tabela de profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  youtube_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles (separada para evitar escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer para checar role sem recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Campanhas
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Entregáveis (Kanban)
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('Meta','TikTok','YouTube')),
  format TEXT NOT NULL,
  briefing_text TEXT,
  status TEXT NOT NULL DEFAULT 'Briefing' CHECK (status IN ('Briefing','Roteiro em Análise','Aguardando Gravação','Em Aprovação','Publicado')),
  file_url TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Métricas
CREATE TABLE public.metrics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reach BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  views BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  coupon_code TEXT,
  revenue_registered NUMERIC(12,2) DEFAULT 0,
  is_featured_on_portfolio BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER deliverables_updated BEFORE UPDATE ON public.deliverables FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER metrics_updated BEFORE UPDATE ON public.metrics_reports FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trigger para criar profile + role no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role app_role;
  _name TEXT;
  _username TEXT;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'creator');
  _name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));
  _username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1) || '-' || substr(NEW.id::text,1,6));

  INSERT INTO public.profiles (user_id, name, username) VALUES (NEW.id, _name, _username);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: visíveis publicamente (necessário para mídia kit)
CREATE POLICY "Profiles publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles: usuário vê seu próprio role; ninguém edita pelo cliente
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Campaigns: agência vê/gerencia tudo; creator vê campanhas onde tem entregas
CREATE POLICY "Agencies manage campaigns" ON public.campaigns FOR ALL
  USING (public.has_role(auth.uid(),'agency')) WITH CHECK (public.has_role(auth.uid(),'agency'));
CREATE POLICY "Creators view their campaigns" ON public.campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.deliverables d WHERE d.campaign_id = campaigns.id AND d.creator_id = auth.uid()));

-- Deliverables: agência tudo; creator vê próprias e atualiza file_url/status
CREATE POLICY "Agencies manage deliverables" ON public.deliverables FOR ALL
  USING (public.has_role(auth.uid(),'agency')) WITH CHECK (public.has_role(auth.uid(),'agency'));
CREATE POLICY "Creators view own deliverables" ON public.deliverables FOR SELECT
  USING (auth.uid() = creator_id);
CREATE POLICY "Creators update own deliverables" ON public.deliverables FOR UPDATE
  USING (auth.uid() = creator_id);

-- Metrics: creator gerencia próprias; agência vê tudo; destaques são públicos
CREATE POLICY "Public can view featured metrics" ON public.metrics_reports FOR SELECT
  USING (is_featured_on_portfolio = true);
CREATE POLICY "Agencies view all metrics" ON public.metrics_reports FOR SELECT
  USING (public.has_role(auth.uid(),'agency'));
CREATE POLICY "Creators manage own metrics" ON public.metrics_reports FOR ALL
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
