# Wolf Flow

App de acompanhamento de hábitos: crie hábitos com dias fixos ou meta semanal,
faça check-ins diários (inclusive retroativos na semana corrente), acompanhe
streaks e veja o histórico geral em mapa de calor. Instalável como PWA — dá
para adicionar à tela inicial do celular e abrir como um app nativo.

**Produção:** https://wolfflow.vercel.app

**Stack:** React 19 · TanStack Start/Router (SSR) · TanStack Query · Tailwind 4 +
shadcn/ui · Supabase (auth + Postgres com RLS) · PWA (manifest + service worker).

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

   > A migration `20260704120000_track_flow.sql` cria as tabelas `habits`,
   > `habit_entries`, `profiles` e as de integrações opcionais (Strava,
   > relógio), todas com Row Level Security.

3. Copie a URL e a chave _publishable_ (Settings → API) para o `.env`.
4. Em **Authentication → Sign In / Providers**, desligue "Confirm email" se
   quiser cadastro instantâneo sem exigir clique em link de confirmação
   (recomendado para testes; no plano gratuito o envio de e-mails é limitado).

## Deploy (Vercel)

O projeto já roda gratuito no plano Hobby da Vercel — sem custo, desde que o
Supabase também fique no plano Free.

1. Importe este repositório em [vercel.com/new](https://vercel.com/new).
2. Em **Environment Variables**, defina (mesmos valores do `.env`):
   - `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`
3. Em **Authentication → URL Configuration** no Supabase, adicione a URL do
   deploy (ex.: `https://seu-app.vercel.app`) como _Site URL_ e em
   _Redirect URLs_, para o e-mail de confirmação de cadastro funcionar (se
   "Confirm email" estiver ligado).

O build usa a Vercel Build Output API v3 via `scripts/build-vercel.mjs`: o
comando `bun run build` roda o build SSR do TanStack Start e depois empacota
a função serverless (rastreando as dependências reais com `@vercel/nft`, já
que o build de SSR do Vite não inlina pacotes de `node_modules`). Qualquer
outro host que rode o build do Vite/TanStack Start também serve — adaptando
esse script de empacotamento.

## PWA (instalável)

`public/manifest.webmanifest` e `public/sw.js` tornam o app instalável na
tela inicial (Android/desktop: prompt "Instalar app"; iOS: Compartilhar →
"Adicionar à Tela de Início"). O service worker cacheia só os assets
estáticos com hash (`/assets`, `/icons`) — nunca o HTML — para não servir
uma página desatualizada de login ou dados do usuário.

## Integração Strava (opcional, não configurada)

Valida exercícios automaticamente: treinos registrados no Strava marcam o
check-in dos hábitos com "Validar com Strava" ligado. O schema do banco e o
código das Edge Functions já existem, mas dependem de credenciais do Strava
que não estão configuradas neste projeto.

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

## App de relógio (Amazfit Bip 6) — opcional, não configurado

O diretório [`zepp-watch/`](zepp-watch/) tem um mini app Zepp OS que marca
check-ins do pulso, pareado por código em **Perfil → Relógio**. Backend:
Edge Function `watch-api` (`supabase functions deploy watch-api
--no-verify-jwt`). Instruções completas em `zepp-watch/README.md`.

## Scripts

| Comando          | Descrição                   |
| ---------------- | --------------------------- |
| `bun run dev`    | Servidor de desenvolvimento |
| `bun run build`  | Build de produção           |
| `bun run lint`   | ESLint                      |
| `bun run format` | Prettier                    |
