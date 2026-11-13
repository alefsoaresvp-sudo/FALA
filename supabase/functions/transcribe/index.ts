import { createClient } from "npm:@supabase/supabase-js@2.82.0";

const allowedOrigins = new Set([
  "https://alefsoaresvp-sudo.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const acceptedTypes = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://alefsoaresvp-sudo.github.io",
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
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, { error: "Faça login para transcrever o áudio." }, 401);
  }
  if (!url || !anonKey) {
    console.error("Supabase function environment is incomplete");
    return jsonResponse(request, { error: "Server authentication is not configured." }, 500);
  }
  if (!openAiKey) {
    console.error("OPENAI_API_KEY is not configured for the transcribe function");
    return jsonResponse(request, { error: "Transcription is not configured. Add OPENAI_API_KEY to Supabase Function Secrets." }, 503);
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return jsonResponse(request, { error: "Sua sessão expirou. Entre novamente." }, 401);

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
    return jsonResponse(request, { error: "O áudio excede o limite de 10 MB. Grave um trecho mais curto." }, 413);
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("file");
  if (!(audio instanceof File)) {
    return jsonResponse(request, { error: "Nenhum arquivo de áudio foi recebido. Grave novamente." }, 400);
  }
  if (audio.size === 0) return jsonResponse(request, { error: "O arquivo de áudio está vazio. Grave novamente." }, 400);
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonResponse(request, { error: "O áudio excede o limite de 10 MB. Grave um trecho mais curto." }, 413);
  }

  const audioType = normalizedAudioType(audio);
  if (!acceptedTypes.has(audioType)) {
    return jsonResponse(request, { error: "Formato de áudio não suportado. Use gravação do navegador em WEBM ou MP4." }, 415);
  }

  const extension = audioType === "audio/mp4" ? "m4a"
    : audioType === "audio/mpeg" ? "mp3"
      : audioType === "audio/wav" ? "wav"
        : audioType === "audio/ogg" ? "ogg" : "webm";

  const payload = new FormData();
  payload.append("file", new File([audio], "fala-practice." + extension, { type: audioType }));
  payload.append("model", "gpt-transcribe");
  payload.append("response_format", "json");
  payload.append("language", "en");
  payload.append("prompt", "A Brazilian Portuguese-speaking learner is practicing spoken English. Transcribe the English words faithfully. Do not translate or correct the sentence.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const transcription = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: payload,
      signal: controller.signal,
    });

    const result = await transcription.json().catch(() => ({}));
    if (!transcription.ok) {
      const providerCode = result?.error?.code ?? result?.error?.type ?? "unknown";
      console.error("Transcription provider failed", transcription.status, providerCode);
      if (transcription.status === 429) {
        return jsonResponse(request, { error: "A API de transcrição está com limite ou saldo insuficiente. Confira o faturamento da OpenAI." }, 429);
      }
      if (transcription.status === 401) {
        return jsonResponse(request, { error: "A chave OpenAI do Supabase é inválida ou foi revogada. Atualize OPENAI_API_KEY." }, 503);
      }
      if (transcription.status === 413) {
        return jsonResponse(request, { error: "O provedor recusou o áudio por tamanho. Grave um trecho menor." }, 413);
      }
      return jsonResponse(request, { error: "O serviço de transcrição recusou o áudio. Tente novamente com uma gravação mais curta." }, 502);
    }

    const text = typeof result.text === "string" ? result.text.trim() : "";
    return jsonResponse(request, { text, duration_seconds: null });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("Transcription request failed", timedOut ? "timeout" : "network");
    return jsonResponse(request, {
      error: timedOut
        ? "A transcrição demorou mais que 45 segundos. Tente um áudio mais curto."
        : "Não foi possível conectar ao serviço de transcrição. Tente novamente.",
    }, timedOut ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }
});
