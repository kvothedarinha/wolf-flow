# Track Flow

App de acompanhamento de hábitos: crie hábitos com dias fixos ou meta semanal,
faça check-ins diários (inclusive retroativos na semana corrente), acompanhe
streaks e veja o histórico geral em mapa de calor.

**Stack:** React 19 · TanStack Start/Router (SSR) · TanStack Query · Tailwind 4 +
shadcn/ui · Supabase (auth + Postgres com RLS).

## Rodando localmente

```sh
bun install
cp .env.example .env        # preencha com as chaves do seu projeto Supabase
bun run dev                 # http://localhost:5173
```

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (ou use um existente).
2. Aplique as migrations de `supabase/migrations/` em ordem — pelo SQL Editor do
   dashboard ou com a CLI:

   ```sh
   supabase link --project-ref SEU-PROJETO
   supabase db push
   ```

   > A migration `20260704120000_track_flow.sql` remove as tabelas do app
   > anterior (Creator Hub) e cria `habits` e `habit_entries`.

3. Copie a URL e a chave _publishable_ (Settings → API) para o `.env`.

## Deploy (Vercel)

1. Importe este repositório em [vercel.com/new](https://vercel.com/new) — a
   Vercel detecta TanStack Start automaticamente.
2. Em **Environment Variables**, defina:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Em **Authentication → URL Configuration** no Supabase, adicione a URL do
   deploy (ex.: `https://track-flow.vercel.app`) como _Site URL_ e em
   _Redirect URLs_, para o e-mail de confirmação de cadastro funcionar.

Qualquer host que rode o build do Vite/TanStack Start também serve
(`bun run build` gera `dist/`).

## Integração Strava (opcional)

Valida exercícios automaticamente: treinos registrados no Strava marcam o
check-in dos hábitos com "Validar com Strava" ligado.

1. Crie um app em [strava.com/settings/api](https://www.strava.com/settings/api).
   Em **Authorization Callback Domain**, coloque `SEU-PROJETO.supabase.co`.
2. Configure os segredos e faça o deploy das funções (CLI do Supabase):

   ```sh
   supabase secrets set \
     STRAVA_CLIENT_ID=... \
     STRAVA_CLIENT_SECRET=... \
     STRAVA_VERIFY_TOKEN=um-token-aleatorio \
     APP_URL=https://seu-app.vercel.app
   supabase functions deploy strava-auth --no-verify-jwt
   supabase functions deploy strava-webhook --no-verify-jwt
   ```

   > `--no-verify-jwt` é necessário: o callback OAuth e o webhook são chamados
   > pelo Strava, sem JWT. A função valida o usuário por conta própria.

3. Registre a assinatura do webhook (uma única vez):

   ```sh
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -d client_id=SEU_CLIENT_ID \
     -d client_secret=SEU_CLIENT_SECRET \
     -d callback_url=https://SEU-PROJETO.supabase.co/functions/v1/strava-webhook \
     -d verify_token=um-token-aleatorio
   ```

4. No app: **Perfil → Conexões → Conectar** ao Strava, e ligue
   **"Validar com Strava"** nos hábitos de exercício. A cada atividade nova,
   o check-in do dia é marcado com a nota "Validado pelo Strava".

## Scripts

| Comando          | Descrição                   |
| ---------------- | --------------------------- |
| `bun run dev`    | Servidor de desenvolvimento |
| `bun run build`  | Build de produção           |
| `bun run lint`   | ESLint                      |
| `bun run format` | Prettier                    |
