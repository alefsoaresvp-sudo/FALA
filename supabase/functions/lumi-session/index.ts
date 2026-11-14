import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.82.0";

const AGENT_ID = "agent_1401m7decjetez0t21n5cdcyxfy7";
const allowedOrigins = new Set([
  "https://alefsoaresvp-sudo.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = allowedOrigins.has(origin);
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  const origin = request.headers.get("Origin") ?? "";
  if (!allowedOrigins.has(origin)) {
    return jsonResponse(request, { error: "Origin not allowed" }, 403);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, { error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Lumi session function: Supabase environment missing");
    return jsonResponse(request, { error: "Server authentication is not configured." }, 500);
  }
  if (!elevenLabsKey) {
    console.error("Lumi session function: ELEVENLABS_API_KEY is not configured");
    return jsonResponse(request, {
      error: "A integração de voz ainda não foi configurada. Adicione ELEVENLABS_API_KEY aos secrets das Edge Functions no Supabase.",
    }, 503);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse(request, { error: "Invalid user session" }, 401);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
    url.searchParams.set("agent_id", AGENT_ID);

    const response = await fetch(url, {
      method: "GET",
      headers: { "xi-api-key": elevenLabsKey },
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload?.token !== "string" || !payload.token) {
      console.error("ElevenLabs conversation token request failed", response.status);
      return jsonResponse(request, {
        error: response.status === 401 || response.status === 403
          ? "A chave ou a permissão da ElevenLabs é inválida. Revise ELEVENLABS_API_KEY no Supabase."
          : response.status === 429
            ? "O limite de uso da ElevenLabs foi atingido. Tente novamente mais tarde."
            : "Não foi possível preparar a sessão de voz da Lumi.",
      }, response.status === 429 ? 429 : 502);
    }

    // The short-lived token is returned to the authenticated browser.
    // The persistent ElevenLabs API key never leaves this Edge Function.
    return jsonResponse(request, { conversation_token: payload.token });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("Lumi session token request failed", timedOut ? "timeout" : "network");
    return jsonResponse(request, {
      error: timedOut
        ? "A ElevenLabs demorou para responder. Tente novamente."
        : "Falha de conexão ao preparar a sessão de voz.",
    }, timedOut ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }
});
