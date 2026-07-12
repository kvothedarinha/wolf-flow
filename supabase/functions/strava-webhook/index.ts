// Webhook do Strava: valida a assinatura (GET) e, a cada atividade criada,
// marca o check-in dos hábitos do usuário com auto_source = 'strava'.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const VERIFY_TOKEN = Deno.env.get("STRAVA_VERIFY_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Garante um access token válido, renovando com o refresh token se preciso. */
async function freshAccessToken(conn: {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}): Promise<string | null> {
  if (new Date(conn.expires_at).getTime() - Date.now() > 60_000) return conn.access_token;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) return null;
  const token = await res.json();
  await admin
    .from("strava_connections")
    .update({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
    })
    .eq("user_id", conn.user_id);
  return token.access_token;
}

async function handleActivity(ownerId: number, activityId: number) {
  const { data: conn } = await admin
    .from("strava_connections")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("athlete_id", ownerId)
    .maybeSingle();
  if (!conn) return;

  const accessToken = await freshAccessToken(conn);
  if (!accessToken) return;

  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return;
  const activity = await res.json();
  // data local do atleta (ex.: "2026-07-12T07:30:00Z" em start_date_local)
  const entryDate = String(activity.start_date_local ?? activity.start_date).slice(0, 10);

  const { data: habits } = await admin
    .from("habits")
    .select("id")
    .eq("user_id", conn.user_id)
    .eq("auto_source", "strava")
    .eq("kind", "build")
    .eq("archived", false);
  if (!habits?.length) return;

  for (const habit of habits) {
    await admin.from("habit_entries").upsert(
      {
        habit_id: habit.id,
        user_id: conn.user_id,
        entry_date: entryDate,
        note: `Validado pelo Strava: ${activity.name ?? "atividade"}`,
      },
      { onConflict: "habit_id,entry_date", ignoreDuplicates: true },
    );
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Validação da assinatura do webhook
  if (req.method === "GET") {
    if (url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
      return new Response(
        JSON.stringify({ "hub.challenge": url.searchParams.get("hub.challenge") }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("verify_token inválido", { status: 403 });
  }

  // Evento (o Strava exige resposta 200 em até 2s)
  if (req.method === "POST") {
    const event = await req.json().catch(() => null);
    if (event?.object_type === "activity" && event.aspect_type === "create") {
      const work = handleActivity(event.owner_id, event.object_id).catch((e) =>
        console.error("strava-webhook:", e),
      );
      // processa em segundo plano sem atrasar a resposta (EdgeRuntime existe nas Edge Functions)
      const edge = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
        .EdgeRuntime;
      if (edge) edge.waitUntil(work);
      else await work;
    }
    return new Response("ok");
  }

  return new Response("Método não suportado", { status: 405 });
});
