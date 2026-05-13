import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-me-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface WebhookBody {
  event?: string;
  data?: {
    id?: string;
    protocol?: string;
    status?: string;
    tracking?: string | null;
    self_tracking?: string | null;
    tracking_url?: string | null;
    tags?: { tag?: string; url?: string }[];
  };
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const base64 = (buffer: ArrayBuffer) => {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
};

const hmacSha256 = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
};

const validateSignature = async (req: Request, rawBody: string) => {
  const secret = Deno.env.get("MELHOR_ENVIO_WEBHOOK_SECRET");
  if (!secret) {
    console.error("MELHOR_ENVIO_WEBHOOK_SECRET not configured");
    return false;
  }

  const signature = (req.headers.get("x-me-signature") || "").replace(/^sha256=/i, "");
  if (!signature) return false;

  const expected = await hmacSha256(secret, rawBody);
  return timingSafeEqual(expected, signature);
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return json({ success: true, message: "OK" });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await req.text();

    if (!rawBody.trim()) {
      return json({ success: true, message: "Webhook test received" });
    }

    let body: WebhookBody | null = null;
    try {
      body = JSON.parse(rawBody) as WebhookBody;
    } catch {
      return json({ success: true, message: "Webhook test received" });
    }

    const hasEventData = Boolean(body?.event || body?.data);
    if (!hasEventData) {
      return json({ success: true, message: "Webhook test received" });
    }

    const signatureValid = await validateSignature(req, rawBody);
    if (!signatureValid) {
      console.warn("Melhor Envio webhook rejected: invalid signature");
      return json({ error: "Invalid signature" }, 401);
    }

    const orderIdTag = body?.data?.tags?.find((tag) => tag?.tag)?.tag || null;
    const tracking = body?.data?.tracking || body?.data?.self_tracking || null;
    const shippingStatus = body?.data?.status || body?.event || null;
    const melhorEnvioId = body?.data?.id || null;

    if (!orderIdTag) {
      return json({ success: true, message: "Webhook without order tag" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (tracking) updatePayload.tracking_code = tracking;
    if (shippingStatus) updatePayload.shipping_status = shippingStatus;
    if (melhorEnvioId) updatePayload.melhor_envio_id = melhorEnvioId;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderIdTag);

    if (error) {
      console.error("Error updating order from Melhor Envio webhook", orderIdTag, error.message);
      return json({ error: "Failed to update order" }, 500);
    }

    return json({ success: true });
  } catch (error: any) {
    console.error("Melhor Envio webhook error", error?.message || error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
});
