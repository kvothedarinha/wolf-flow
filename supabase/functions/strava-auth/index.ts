// Conexão OAuth com o Strava.
// POST (com JWT do usuário): cria um state e devolve a URL de autorização.
// GET ?code=&state= (callback público do Strava): troca o code por tokens,
// grava a conexão e redireciona de volta ao app.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function redirectToApp(status: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_URL}/profile?strava=${status}` },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // Callback do Strava (público)
  if (req.method === "GET" && url.searchParams.has("state")) {
    const state = url.searchParams.get("state")!;
    const code = url.searchParams.get("code");

    const { data: stateRow } = await admin
      .from("strava_oauth_states")
      .select("user_id, created_at")
      .eq("state", state)
      .maybeSingle();
    await admin.from("strava_oauth_states").delete().eq("state", state);

    const fresh = stateRow && Date.now() - new Date(stateRow.created_at).getTime() < 15 * 60 * 1000;
    if (!stateRow || !fresh || !code) return redirectToApp("erro");

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return redirectToApp("erro");
    const token = await tokenRes.json();

    const { error } = await admin.from("strava_connections").upsert({
      user_id: stateRow.user_id,
      athlete_id: token.athlete.id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
    });
    return redirectToApp(error ? "erro" : "conectado");
  }

  // Início do fluxo (exige usuário autenticado)
  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization") ?? "";
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: stateRow, error } = await admin
      .from("strava_oauth_states")
      .insert({ user_id: user.id })
      .select("state")
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/strava-auth`;
    const authorize = new URL("https://www.strava.com/oauth/authorize");
    authorize.searchParams.set("client_id", CLIENT_ID);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("scope", "read,activity:read_all");
    authorize.searchParams.set("approval_prompt", "auto");
    authorize.searchParams.set("state", stateRow.state);

    return new Response(JSON.stringify({ url: authorize.toString() }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response("Método não suportado", { status: 405, headers: cors });
});
