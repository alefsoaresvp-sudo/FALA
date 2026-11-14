import { createClient } from "npm:@supabase/supabase-js@2.82.0";

const allowedOrigins = new Set([
  "https://alefsoaresvp-sudo.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const acceptedTypes = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://alefsoaresvp-sudo.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function normalizedAudioType(file: File): string {
  const supplied = file.type.split(";")[0].trim().toLowerCase();
  if (supplied === "audio/x-m4a" || supplied === "audio/m4a") return "audio/mp4";
  if (supplied === "audio/x-wav") return "audio/wav";
  if (supplied && acceptedTypes.has(supplied)) return supplied;
  const name = file.name.toLowerCase();
  if (name.endsWith(".m4a") || name.endsWith(".mp4")) return "audio/mp4";
  if (name.endsWith(".mp3") || name.endsWith(".mpeg")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".ogg") || name.endsWith(".oga")) return "audio/ogg";
  if (name.endsWith(".webm")) return "audio/webm";
  return supplied;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, { error: "Faça login para transcrever o áudio." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!url || !anonKey) {
    console.error("Transcribe: Supabase environment is incomplete");
    return jsonResponse(request, { error: "Server authentication is not configured." }, 500);
  }
  if (!elevenLabsKey) {
    console.error("Transcribe: ELEVENLABS_API_KEY is not configured");
    return jsonResponse(request, { error: "A transcrição requer ELEVENLABS_API_KEY nos secrets das Edge Functions." }, 503);
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return jsonResponse(request, { error: "Sua sessão expirou. Entre novamente." }, 401);

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
    return jsonResponse(request, { error: "O áudio excede o limite de 10 MB. Grave um trecho mais curto." }, 413);
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("file");
  if (!(audio instanceof File)) return jsonResponse(request, { error: "Nenhum arquivo de áudio foi recebido. Grave novamente." }, 400);
  if (!audio.size) return jsonResponse(request, { error: "O arquivo de áudio está vazio. Grave novamente." }, 400);
  if (audio.size > MAX_AUDIO_BYTES) return jsonResponse(request, { error: "O áudio excede o limite de 10 MB. Grave um trecho mais curto." }, 413);

  const audioType = normalizedAudioType(audio);
  if (!acceptedTypes.has(audioType)) {
    return jsonResponse(request, { error: "Formato de áudio não suportado. Use WEBM, MP4, MP3, WAV ou OGG." }, 415);
  }

  const payload = new FormData();
  payload.append("file", new File([audio], audio.name || "fala-practice.webm", { type: audioType }));
  payload.append("model_id", "scribe_v2");
  payload.append("language_code", "en");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const transcription = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey },
      body: payload,
      signal: controller.signal,
    });
    const result = await transcription.json().catch(() => ({}));
    if (!transcription.ok) {
      const providerMessage = typeof result?.detail?.message === "string" ? result.detail.message.slice(0, 180) : "";
      console.error("ElevenLabs transcription failed", transcription.status, result?.detail?.status ?? "provider_error");
      if (transcription.status === 401 || transcription.status === 403) {
        return jsonResponse(request, { error: "A chave ElevenLabs está inválida ou sem permissão Speech to Text. Revise a permissão da chave." }, 503);
      }
      if (transcription.status === 429) {
        return jsonResponse(request, { error: "O limite da ElevenLabs foi atingido. Tente novamente mais tarde." }, 429);
      }
      if (transcription.status === 422 || transcription.status === 400) {
        return jsonResponse(request, { error: providerMessage || "A ElevenLabs recusou este áudio. Grave novamente em um formato compatível." }, 422);
      }
      return jsonResponse(request, { error: "A ElevenLabs não conseguiu transcrever o áudio agora." }, 502);
    }

    const text = typeof result.text === "string" ? result.text.trim() : "";
    if (!text) return jsonResponse(request, { error: "Não identificamos palavras no áudio. Grave em um ambiente silencioso e tente novamente." }, 422);
    return jsonResponse(request, { text, language_code: result.language_code ?? "en" });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("ElevenLabs transcription request failed", timedOut ? "timeout" : "network");
    return jsonResponse(request, {
      error: timedOut ? "A transcrição demorou mais que 45 segundos. Tente um áudio mais curto." : "Não foi possível conectar à ElevenLabs. Tente novamente.",
    }, timedOut ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }
});