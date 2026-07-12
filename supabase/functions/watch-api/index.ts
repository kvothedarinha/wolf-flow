// API para dispositivos (relógio Zepp OS / Atalhos do iOS).
// POST /watch-api/pair   { code }                  → { token }
// GET  /watch-api/today  ?date=yyyy-mm-dd          → { progress, habits: [...] }
// POST /watch-api/toggle { habit_id, date, done }  → { ok }
// Autenticação de /today e /toggle: Authorization: Bearer <token do dispositivo>.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PAIR_CODE_TTL_MS = 10 * 60 * 1000;
const HISTORY_DAYS = 120;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(key: string, delta: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return dateKey(d);
}

async function userFromToken(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const hash = await sha256Hex(token);
  const { data } = await admin
    .from("device_tokens")
    .select("id, user_id")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!data) return null;
  await admin
    .from("device_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return data.user_id;
}

/** Resumo por hábito para a tela do relógio. */
function habitSummary(
  habit: {
    id: string;
    name: string;
    color: string;
    kind: string;
    frequency: string;
    weekdays: number[];
    target_per_week: number;
    created_at: string;
  },
  dates: Set<string>,
  todayKey: string,
) {
  const quit = habit.kind === "quit";
  const dow = new Date(`${todayKey}T12:00:00Z`).getUTCDay();
  const scheduledToday = quit || habit.frequency === "weekly" || habit.weekdays.includes(dow);
  const hasEntry = dates.has(todayKey);
  const done = quit ? !hasEntry : hasEntry;

  let meta: string;
  if (quit) {
    let free = 0;
    let day = todayKey;
    const createdKey = habit.created_at.slice(0, 10);
    while (free < 999 && !dates.has(day) && day >= createdKey) {
      free++;
      day = addDays(day, -1);
    }
    meta = hasEntry ? "recaída hoje" : `${free} dias livre`;
  } else if (habit.frequency === "weekly") {
    let count = 0;
    for (let i = 0; i <= dow; i++) if (dates.has(addDays(todayKey, -i))) count++;
    meta = `${count}/${habit.target_per_week} na semana`;
  } else {
    let streak = 0;
    let day = todayKey;
    for (let i = 0; i < 400; i++) {
      const d = new Date(`${day}T12:00:00Z`).getUTCDay();
      if (habit.weekdays.includes(d)) {
        if (dates.has(day)) streak++;
        else if (day !== todayKey) break;
      }
      day = addDays(day, -1);
    }
    meta = `${streak} dias`;
  }
  return {
    id: habit.id,
    name: habit.name,
    color: parseInt(habit.color.replace("#", ""), 16),
    quit,
    scheduledToday,
    hasEntry,
    done,
    meta,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const path = new URL(req.url).pathname.split("/").pop();

  if (path === "pair" && req.method === "POST") {
    const { code } = (await req.json().catch(() => ({}))) as { code?: string };
    if (!code) return json({ error: "Código ausente" }, 400);
    const { data: row } = await admin
      .from("watch_pair_codes")
      .select("user_id, created_at")
      .eq("code", String(code))
      .maybeSingle();
    await admin.from("watch_pair_codes").delete().eq("code", String(code));
    if (!row || Date.now() - new Date(row.created_at).getTime() > PAIR_CODE_TTL_MS) {
      return json({ error: "Código inválido ou expirado" }, 401);
    }
    const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const { error } = await admin.from("device_tokens").insert({
      user_id: row.user_id,
      token_hash: await sha256Hex(token),
      label: "Relógio",
    });
    if (error) return json({ error: error.message }, 500);
    return json({ token });
  }

  const userId = await userFromToken(req);
  if (!userId) return json({ error: "Não autorizado" }, 401);

  const url = new URL(req.url);
  const todayKey = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("date") ?? "")
    ? url.searchParams.get("date")!
    : dateKey(new Date());

  if (path === "today" && req.method === "GET") {
    const [{ data: habits }, { data: entries }] = await Promise.all([
      admin
        .from("habits")
        .select("id, name, color, kind, frequency, weekdays, target_per_week, created_at")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("created_at", { ascending: true }),
      admin
        .from("habit_entries")
        .select("habit_id, entry_date")
        .eq("user_id", userId)
        .gte("entry_date", addDays(todayKey, -HISTORY_DAYS)),
    ]);

    const byHabit = new Map<string, Set<string>>();
    for (const e of entries ?? []) {
      if (!byHabit.has(e.habit_id)) byHabit.set(e.habit_id, new Set());
      byHabit.get(e.habit_id)!.add(e.entry_date);
    }

    const list = (habits ?? [])
      .map((h) => habitSummary(h, byHabit.get(h.id) ?? new Set(), todayKey))
      .filter((h) => h.scheduledToday);
    const doneCount = list.filter((h) => h.done).length;
    return json({ date: todayKey, done: doneCount, total: list.length, habits: list });
  }

  if (path === "toggle" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as {
      habit_id?: string;
      date?: string;
      done?: boolean;
    };
    if (!body.habit_id) return json({ error: "habit_id ausente" }, 400);
    const entryDate = /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "") ? body.date! : todayKey;

    // garante que o hábito é do dono do token
    const { data: habit } = await admin
      .from("habits")
      .select("id")
      .eq("id", body.habit_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!habit) return json({ error: "Hábito não encontrado" }, 404);

    if (body.done) {
      const { error } = await admin.from("habit_entries").upsert(
        {
          habit_id: body.habit_id,
          user_id: userId,
          entry_date: entryDate,
          note: "Marcado pelo relógio",
        },
        { onConflict: "habit_id,entry_date", ignoreDuplicates: true },
      );
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await admin
        .from("habit_entries")
        .delete()
        .eq("habit_id", body.habit_id)
        .eq("entry_date", entryDate);
      if (error) return json({ error: error.message }, 500);
    }
    return json({ ok: true });
  }

  return json({ error: "Rota não encontrada" }, 404);
});
