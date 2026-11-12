import { createClient } from "npm:@supabase/supabase-js@2.82.0";

const allowedOrigins = new Set([
  "https://alefsoaresvp-sudo.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://alefsoaresvp-sudo.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!authorization?.startsWith("Bearer ")) return jsonResponse(request, { error: "Authentication required" }, 401);
  if (!url || !anonKey || !openAiKey) return jsonResponse(request, { error: "Server configuration is incomplete" }, 500);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return jsonResponse(request, { error: "Invalid user session" }, 401);

  const form = await request.formData().catch(() => null);
  const audio = form?.get("file");
  if (!(audio instanceof File)) return jsonResponse(request, { error: "Audio file is required" }, 400);
  if (audio.size > 20 * 1024 * 1024) return jsonResponse(request, { error: "Audio must be smaller than 20 MB" }, 413);
  const allowedTypes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg", "audio/x-m4a"];
  const baseAudioType = audio.type.split(";")[0].trim();
  if (baseAudioType && !allowedTypes.includes(baseAudioType)) return jsonResponse(request, { error: "Unsupported audio format" }, 415);

  const payload = new FormData();
  payload.append("file", audio, audio.name || "speech.webm");
  payload.append("model", "gpt-transcribe");
  payload.append("response_format", "json");
  payload.append("prompt", "The speaker is a Brazilian Portuguese-speaking learner practicing English. Transcribe the English words faithfully; do not translate.");

  const transcription = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: payload,
  });
  const result = await transcription.json().catch(() => ({}));
  if (!transcription.ok) {
    console.error("Transcription provider failed", transcription.status, result?.error?.type);
    return jsonResponse(request, { error: "Transcription provider request failed" }, 502);
  }
  return jsonResponse(request, { text: typeof result.text === "string" ? result.text : "" });
});
