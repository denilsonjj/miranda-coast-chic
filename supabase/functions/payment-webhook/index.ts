import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

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
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
};

const formatMoney = (value: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const notifyStoreOfPaidOrder = async (supabase: ReturnType<typeof createClient>, orderId: string, paymentId: string) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return;

  const storeEmail = Deno.env.get("STORE_NOTIFICATION_EMAIL") || "mirandacoastr@gmail.com";
  const fromEmail = Deno.env.get("STORE_NOTIFICATION_FROM") || "Miranda Coast <onboarding@resend.dev>";
  const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL") || "https://mirandacoast.com.br").replace(/\/$/, "");

  const { data: updatedOrder, error: markError } = await supabase
    .from("orders")
    .update({ store_notified_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("store_notified_at", null)
    .select("id,total,shipping_address,shipping_service,order_items(*)")
    .maybeSingle();

  if (markError) {
    console.error("Store notification mark failed", orderId, markError.message);
    return;
  }

  if (!updatedOrder) return;

  const items = Array.isArray(updatedOrder.order_items) ? updatedOrder.order_items : [];
  const itemLines = items
    .map((item: any) => {
      const details = [item.size ? `Tam: ${item.size}` : null, item.color ? `Cor: ${item.color}` : null]
        .filter(Boolean)
        .join(" | ");
      return `<li>${escapeHtml(item.quantity)}x ${escapeHtml(item.product_name)}${details ? ` (${escapeHtml(details)})` : ""}</li>`;
    })
    .join("");
  const customerName = updatedOrder.shipping_address?.name || "Cliente";
  const customerEmail = updatedOrder.shipping_address?.email || "";
  const shippingName = updatedOrder.shipping_service?.pickup
    ? "Retirada na loja"
    : updatedOrder.shipping_service?.name || "Entrega";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [storeEmail],
      subject: `Compra nova paga - Pedido #${orderId.slice(0, 8)}`,
      html: `
        <h2>Compra nova confirmada</h2>
        <p><strong>Pedido:</strong> #${orderId.slice(0, 8)}</p>
        <p><strong>Total:</strong> ${formatMoney(updatedOrder.total)}</p>
        <p><strong>Cliente:</strong> ${escapeHtml(customerName)}${customerEmail ? ` (${escapeHtml(customerEmail)})` : ""}</p>
        <p><strong>Entrega:</strong> ${escapeHtml(shippingName)}</p>
        <p><strong>Pagamento Mercado Pago:</strong> ${escapeHtml(paymentId)}</p>
        <h3>Itens</h3>
        <ul>${itemLines}</ul>
        <p><a href="${publicSiteUrl}/admin">Abrir painel admin</a></p>
      `,
    }),
  });

  if (!response.ok) {
    console.error("Store notification email failed", orderId, response.status, await response.text());
  }
};

const parseMercadoPagoSignature = (header: string) => {
  return header.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, ...valueParts] = part.trim().split("=");
    if (key && valueParts.length) acc[key] = valueParts.join("=");
    return acc;
  }, {});
};

const validateMercadoPagoSignature = async (
  req: Request,
  url: URL,
  body: any,
) => {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!secret) {
    console.error("MERCADO_PAGO_WEBHOOK_SECRET not configured");
    return false;
  }

  const signatureHeader = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";
  const signature = parseMercadoPagoSignature(signatureHeader);
  const ts = signature.ts;
  const v1 = signature.v1;
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("id") || body?.data?.id;

  if (!requestId || !ts || !v1 || !dataId) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = await hmacSha256(secret, manifest);
  return timingSafeEqual(expected, v1);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const rawBody = req.method === "POST" ? await req.text() : "";
    let body: any = null;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
    }

    const topic =
      url.searchParams.get("topic") ||
      url.searchParams.get("type") ||
      body?.type ||
      (typeof body?.action === "string" && body.action.startsWith("payment") ? "payment" : null) ||
      (typeof body?.action === "string" && body.action.startsWith("merchant_order") ? "merchant_order" : null);
    const resourceId = url.searchParams.get("data.id") || url.searchParams.get("id") || body?.data?.id;

    if (resourceId === "123456") {
      return json({ success: true, message: "Mercado Pago webhook test received" });
    }

    const signatureValid = await validateMercadoPagoSignature(req, url, body);
    if (!signatureValid) {
      console.warn("Mercado Pago webhook rejected: invalid signature");
      return json({ error: "Invalid signature" }, 401);
    }

    if (!resourceId || (topic !== "payment" && topic !== "merchant_order")) {
      return json({ success: true, message: "Webhook ignored" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!supabaseUrl || !supabaseKey || !mercadoPagoToken) {
      throw new Error("Webhook dependencies not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let paymentData: any = null;

    if (topic === "payment") {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${mercadoPagoToken}` },
      });
      if (!response.ok) {
        console.error("Failed to fetch payment details", response.status);
        return json({ error: "Failed to fetch payment details" }, 500);
      }
      paymentData = await response.json();
    } else {
      const response = await fetch(`https://api.mercadopago.com/merchant_orders/${resourceId}`, {
        headers: { Authorization: `Bearer ${mercadoPagoToken}` },
      });
      if (!response.ok) {
        console.error("Failed to fetch merchant order details", response.status);
        return json({ error: "Failed to fetch merchant order details" }, 500);
      }
      const merchantOrder = await response.json();
      const lastPayment = Array.isArray(merchantOrder.payments) && merchantOrder.payments.length
        ? merchantOrder.payments[merchantOrder.payments.length - 1]
        : null;

      if (!lastPayment?.id) {
        return json({ success: true, message: "Merchant order without payment" });
      }

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${lastPayment.id}`, {
        headers: { Authorization: `Bearer ${mercadoPagoToken}` },
      });
      if (!paymentResponse.ok) {
        console.error("Failed to fetch merchant order payment details", paymentResponse.status);
        return json({ error: "Failed to fetch payment details" }, 500);
      }
      paymentData = await paymentResponse.json();
    }

    const externalReference = paymentData?.external_reference;
    const status = paymentData?.status;
    const paymentId = paymentData?.id?.toString?.() || resourceId;

    if (!externalReference) {
      return json({ success: true, message: "Payment without external reference" });
    }

    console.log("Processing Mercado Pago webhook", {
      orderId: externalReference,
      paymentId,
      status,
    });

    if (status === "approved") {
      const { error } = await supabase.rpc("confirm_paid_order_and_decrement_stock", {
        _order_id: externalReference,
        _mercado_pago_payment_id: paymentId,
      });

      if (error) {
        console.error("Error confirming paid order and stock", externalReference, error.message);
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "stock_issue",
            mercado_pago_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", externalReference);

        return json({ error: error.message }, 500);
      }

      await notifyStoreOfPaidOrder(supabase, externalReference, paymentId);

      return json({ success: true, message: "Order paid" });
    }

    const pendingStatuses = ["pending", "in_process", "authorized"];
    const failedStatuses = ["rejected", "cancelled", "canceled", "expired"];

    if (pendingStatuses.includes(status)) {
      await supabase
        .from("orders")
        .update({
          payment_status: "pending",
          mercado_pago_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", externalReference)
        .neq("payment_status", "paid");

      return json({ success: true, message: "Order payment pending" });
    }

    if (failedStatuses.includes(status)) {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          status: "failed",
          mercado_pago_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", externalReference)
        .neq("payment_status", "paid");

      return json({ success: true, message: "Order payment failed" });
    }

    return json({ success: true, message: "Status ignored" });
  } catch (error: any) {
    console.error("Payment webhook error", error?.message || error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
});
