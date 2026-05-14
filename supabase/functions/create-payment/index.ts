import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
const cleanDigits = (value: unknown) => String(value || "").replace(/\D/g, "");
const isUuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const formatMoney = (value: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const notifyStoreOfPaidOrder = async (supabase: ReturnType<typeof createClient>, orderId: string, paymentId: string | null) => {
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
        <p><strong>Pagamento Mercado Pago:</strong> ${escapeHtml(paymentId || "confirmado")}</p>
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
      return json({ error: "Payment gateway not configured" }, 500);
    }

    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return json({ error: "Login required" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const body = await req.json();
    const {
      external_reference,
      payer = {},
      back_urls = {},
      payment_method_id,
      token,
      installments,
    } = body || {};

    if (!isUuid(external_reference)) {
      return json({ error: "Pedido invalido" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", external_reference)
      .single();

    if (orderError || !order) {
      return json({ error: "Pedido nao encontrado" }, 404);
    }

    if (order.user_id !== authData.user.id) {
      return json({ error: "Pedido nao pertence ao usuario autenticado" }, 403);
    }

    if (order.payment_status === "paid") {
      return json({ error: "Este pedido ja foi pago" }, 409);
    }

    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
    if (orderItems.length === 0) {
      return json({ error: "Pedido sem itens" }, 400);
    }

    const invalidItem = orderItems.find(
      (item: any) =>
        !item.product_name ||
        Number(item.quantity) <= 0 ||
        item.price === undefined ||
        Number(item.price) < 0,
    );
    if (invalidItem) {
      return json({ error: "Pedido contem itens invalidos" }, 400);
    }

    const itemsTotal = money(
      orderItems.reduce(
        (sum: number, item: any) => sum + money(item.price) * Number(item.quantity || 0),
        0,
      ),
    );
    const shippingCost = money(order.shipping_cost);
    const expectedTotal = money(itemsTotal + shippingCost);
    const storedTotal = money(order.total);

    if (Math.abs(expectedTotal - storedTotal) > 0.02) {
      console.error("Order total mismatch", {
        orderId: order.id,
        expectedTotal,
        storedTotal,
      });
      return json({ error: "Total do pedido divergente. Refaça o checkout." }, 409);
    }

    const itemsWithShipping = [
      ...orderItems.map((item: any) => ({
        id: item.product_id || item.id,
        title: item.product_name,
        description: [item.size ? `Tam: ${item.size}` : null, item.color ? `Cor: ${item.color}` : null]
          .filter(Boolean)
          .join(" | ") || item.product_name,
        picture_url: item.product_image || undefined,
        quantity: Number(item.quantity),
        unit_price: money(item.price),
      })),
      ...(shippingCost > 0
        ? [{
            id: "shipping",
            title: "Frete",
            description: order.shipping_service?.name || "Frete",
            quantity: 1,
            unit_price: shippingCost,
          }]
        : []),
    ];

    const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || "";
    const supabaseFunctionsUrl = supabaseUrl.replace(".supabase.co", ".functions.supabase.co");
    const notificationUrl =
      typeof back_urls?.notification === "string" && back_urls.notification.trim()
        ? back_urls.notification.trim()
        : `${supabaseFunctionsUrl}/payment-webhook`;
    const baseOrderUrl =
      publicSiteUrl ||
      (typeof back_urls?.success === "string" && back_urls.success.includes("/pedido/")
        ? back_urls.success.split("/pedido/")[0]
        : "");

    const paymentMethod = String(payment_method_id || "").toLowerCase();
    const isTransparentPayment = Boolean(paymentMethod);
    const isPix = paymentMethod === "pix";
    const isBoleto = paymentMethod.includes("bol");
    const isCard = isTransparentPayment && !isPix && !isBoleto;

    const payerName = String(payer?.name || authData.user.user_metadata?.full_name || "Cliente").trim();
    const nameParts = payerName.split(/\s+/).filter(Boolean);
    const firstName = String(payer?.first_name || nameParts.shift() || payerName || "Cliente");
    const lastName = String(payer?.last_name || nameParts.join(" ") || "Cliente");
    const documentNumber = cleanDigits(payer?.document || order.shipping_address?.document);
    const documentType = String(payer?.document_type || (documentNumber.length > 11 ? "CNPJ" : "CPF"));

    if (isCard && !token) {
      return json({ error: "Cartao: token nao recebido do frontend" }, 400);
    }

    if ((isPix || isBoleto || isCard) && (!payer?.email || !documentNumber)) {
      return json({ error: "Dados do pagador incompletos" }, 400);
    }

    const idempotencyKey = [
      "order",
      order.id,
      isTransparentPayment ? paymentMethod : "preference",
      String(Math.round(storedTotal * 100)),
    ].join("-");

    if (!isTransparentPayment) {
      const preferencePayload = {
        items: itemsWithShipping.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          picture_url: item.picture_url,
          quantity: item.quantity,
          currency_id: "BRL",
          unit_price: item.unit_price,
        })),
        payer: {
          email: payer?.email || authData.user.email || "",
          name: payerName,
        },
        back_urls: {
          success: back_urls?.success || `${baseOrderUrl}/pedido/${order.id}`,
          failure: back_urls?.failure || `${baseOrderUrl}/pedido/${order.id}`,
          pending: back_urls?.pending || `${baseOrderUrl}/pedido/${order.id}`,
        },
        auto_return: "approved",
        external_reference: order.id,
        statement_descriptor: "MIRANDA COAST",
        notification_url: notificationUrl,
      };

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(preferencePayload),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Mercado Pago preference error", response.status, data?.message || data?.error);
        return json({
          error: data.message || "Failed to create payment preference",
          status: response.status,
        }, response.status);
      }

      return json({
        id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
      });
    }

    const payerAddress = payer?.address || order.shipping_address?.address || {};
    const paymentPayload: Record<string, unknown> = {
      transaction_amount: storedTotal,
      description: `Pedido ${order.id.slice(0, 8)}`,
      payment_method_id,
      payer: {
        email: payer.email || authData.user.email || "",
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: documentType,
          number: documentNumber,
        },
        ...(isBoleto
          ? {
              address: {
                zip_code: cleanDigits(payerAddress.zip_code || payerAddress.postal_code || order.shipping_address?.cep),
                street_name: payerAddress.street_name || payerAddress.street || order.shipping_address?.street || "",
                street_number: String(payerAddress.street_number || payerAddress.number || order.shipping_address?.number || ""),
                neighborhood: payerAddress.neighborhood || order.shipping_address?.neighborhood || "",
                city: payerAddress.city || order.shipping_address?.city || "",
                federal_unit: payerAddress.federal_unit || payerAddress.state || order.shipping_address?.state || "",
              },
            }
          : {}),
      },
      external_reference: order.id,
      statement_descriptor: "MIRANDA COAST",
      notification_url: notificationUrl,
      additional_info: {
        items: itemsWithShipping.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          picture_url: item.picture_url,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      },
    };

    if (token) paymentPayload.token = token;
    if (installments) paymentPayload.installments = Number(installments) || 1;

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Mercado Pago payment error", response.status, data?.message || data?.error);
      return json({
        error: data.message || "Failed to create payment",
        status: response.status,
        status_detail: data.status_detail,
      }, response.status);
    }

    const mercadoPagoPaymentId = data.id?.toString?.() || null;
    if (data.status === "approved") {
      const { error: confirmError } = await supabase.rpc("confirm_paid_order_and_decrement_stock", {
        _order_id: order.id,
        _mercado_pago_payment_id: mercadoPagoPaymentId,
      });

      if (confirmError) {
        console.error("Paid order stock confirmation failed", order.id, confirmError.message);
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "stock_issue",
            mercado_pago_payment_id: mercadoPagoPaymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        return json({
          error: "Pagamento aprovado, mas nao foi possivel confirmar estoque automaticamente.",
          details: confirmError.message,
        }, 409);
      }

      await notifyStoreOfPaidOrder(supabase, order.id, mercadoPagoPaymentId);
    } else {
      const failedStatuses = ["cancelled", "canceled", "rejected", "expired"];
      await supabase
        .from("orders")
        .update({
          payment_status: failedStatuses.includes(data.status) ? "failed" : "pending",
          status: failedStatuses.includes(data.status) ? "failed" : "pending",
          mercado_pago_payment_id: mercadoPagoPaymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (failedStatuses.includes(data.status)) {
        return json({
          error: "Pagamento rejeitado pelo Mercado Pago",
          status: data.status,
          status_detail: data.status_detail,
        }, 400);
      }
    }

    return json({
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      point_of_interaction: data.point_of_interaction,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code || null,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      ticket_url: data.point_of_interaction?.transaction_data?.ticket_url || null,
    });
  } catch (error: any) {
    console.error("Error creating payment", error?.message || error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
});
