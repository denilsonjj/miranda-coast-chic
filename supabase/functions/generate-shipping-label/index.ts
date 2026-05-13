import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const cleanDigits = (value: unknown) => String(value || "").replace(/\D/g, "");
const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} not configured`);
  return value;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const melhorEnvioToken = Deno.env.get("MELHOR_ENVIO_API_TOKEN") || Deno.env.get("MELHOR_ENVIO_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!melhorEnvioToken || !supabaseUrl || !supabaseServiceKey) {
      return json({ error: "Shipping label service not configured" }, 500);
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

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      return json({ error: "Admin access required" }, 403);
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return json({ error: "order_id is required" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return json({ error: "Order not found" }, 404);
    }

    if (order.payment_status !== "paid") {
      return json({ error: "A etiqueta so pode ser gerada depois do pagamento confirmado" }, 409);
    }

    const shippingService = order.shipping_service as any;
    if (!shippingService || shippingService.pickup || shippingService.id === "pickup") {
      return json({ error: "Pedidos de retirada na loja nao precisam de etiqueta" }, 400);
    }

    const serviceToUse = Number(shippingService.id || shippingService.service_id);
    if (!serviceToUse) {
      return json({ error: "Servico de frete nao encontrado no pedido" }, 400);
    }

    const shippingAddress = order.shipping_address as any;
    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
    const recipientDocument = cleanDigits(
      shippingAddress?.document ||
      shippingAddress?.cpf ||
      shippingAddress?.cnpj ||
      shippingAddress?.payer_document,
    );

    if (!recipientDocument) {
      return json({ error: "Documento do destinatario nao encontrado no pedido" }, 400);
    }

    const sender = {
      name: requiredEnv("MELHOR_ENVIO_SENDER_NAME"),
      phone: requiredEnv("MELHOR_ENVIO_SENDER_PHONE"),
      email: requiredEnv("MELHOR_ENVIO_SENDER_EMAIL"),
      document: cleanDigits(requiredEnv("MELHOR_ENVIO_SENDER_DOCUMENT")),
      address: requiredEnv("MELHOR_ENVIO_SENDER_STREET"),
      number: requiredEnv("MELHOR_ENVIO_SENDER_NUMBER"),
      complement: Deno.env.get("MELHOR_ENVIO_SENDER_COMPLEMENT") || "",
      district: requiredEnv("MELHOR_ENVIO_SENDER_DISTRICT"),
      city: requiredEnv("MELHOR_ENVIO_SENDER_CITY"),
      state_abbr: requiredEnv("MELHOR_ENVIO_SENDER_STATE"),
      postal_code: cleanDigits(requiredEnv("MELHOR_ENVIO_SENDER_POSTAL_CODE")),
      country_id: "BR",
      company_document: cleanDigits(Deno.env.get("MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT") || ""),
      state_register: Deno.env.get("MELHOR_ENVIO_SENDER_STATE_REGISTER") || "",
      economic_activity_code: Deno.env.get("MELHOR_ENVIO_SENDER_CNAE") || "",
    };

    const defaultVolume = {
      length: Number(Deno.env.get("MELHOR_ENVIO_DEFAULT_LENGTH") || 16),
      width: Number(Deno.env.get("MELHOR_ENVIO_DEFAULT_WIDTH") || 11),
      height: Number(Deno.env.get("MELHOR_ENVIO_DEFAULT_HEIGHT") || 3),
      weight: Number(Deno.env.get("MELHOR_ENVIO_DEFAULT_WEIGHT") || 0.2),
    };

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${melhorEnvioToken}`,
      "User-Agent": Deno.env.get("MELHOR_ENVIO_USER_AGENT") || "Miranda Coast (contato@mirandacoast.com.br)",
    };

    const cartResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/cart", {
      method: "POST",
      headers,
      body: JSON.stringify({
        service: serviceToUse,
        from: sender,
        to: {
          name: shippingAddress?.name || "Cliente",
          phone: shippingAddress?.phone || "",
          email: shippingAddress?.email || "",
          document: recipientDocument,
          address: shippingAddress?.street,
          number: shippingAddress?.number,
          complement: shippingAddress?.complement || "",
          district: shippingAddress?.neighborhood,
          city: shippingAddress?.city,
          state_abbr: shippingAddress?.state,
          postal_code: cleanDigits(shippingAddress?.cep),
          country_id: "BR",
        },
        products: orderItems.map((item: any) => ({
          name: item.product_name || "Item",
          quantity: Number(item.quantity) || 1,
          unitary_value: Number(item.price) || 0,
        })),
        volumes: [{
          ...defaultVolume,
          insurance_value: Number(order.total || order.subtotal || 0),
        }],
        options: {
          insurance_value: Number(order.total || order.subtotal || 0),
          receipt: false,
          own_hand: false,
          collect: false,
          platform: Deno.env.get("MELHOR_ENVIO_PLATFORM") || "Miranda Coast",
          tags: [{ tag: String(order_id), url: "" }],
          reminder: `Pedido ${order_id}`,
        },
      }),
    });

    if (!cartResponse.ok) {
      const errorText = await cartResponse.text();
      console.error("Melhor Envio cart error", cartResponse.status, errorText);
      return json({ error: "Nao foi possivel adicionar o frete ao carrinho", details: errorText }, 502);
    }

    const cartData = await cartResponse.json();
    const cartItemId = cartData.id;
    if (!cartItemId) {
      return json({ error: "Melhor Envio nao retornou o id da etiqueta" }, 502);
    }

    const checkoutResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ orders: [cartItemId] }),
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error("Melhor Envio checkout error", checkoutResponse.status, errorText);
      await supabase
        .from("orders")
        .update({
          melhor_envio_id: cartItemId,
          shipping_status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      return json({
        success: false,
        draft: true,
        melhor_envio_id: cartItemId,
        message: "Etiqueta criada como rascunho. Finalize no painel do Melhor Envio.",
        details: errorText,
      });
    }

    const generateResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/generate", {
      method: "POST",
      headers,
      body: JSON.stringify({ orders: [cartItemId] }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("Melhor Envio generate error", generateResponse.status, errorText);
      return json({ error: "Nao foi possivel gerar a etiqueta", details: errorText }, 502);
    }

    const printResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/print", {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "public", orders: [cartItemId] }),
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      console.error("Melhor Envio print error", printResponse.status, errorText);
      return json({ error: "Nao foi possivel imprimir a etiqueta", details: errorText }, 502);
    }

    const printData = await printResponse.json();

    const trackingResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/tracking", {
      method: "POST",
      headers,
      body: JSON.stringify({ orders: [cartItemId] }),
    });

    let trackingCode = null;
    if (trackingResponse.ok) {
      const trackingData = await trackingResponse.json();
      trackingCode = trackingData?.[cartItemId]?.tracking || null;
    }

    await supabase
      .from("orders")
      .update({
        melhor_envio_id: cartItemId,
        shipping_label_url: printData.url || null,
        shipping_status: trackingCode ? "generated" : "label_generated",
        ...(trackingCode ? { tracking_code: trackingCode, status: "shipped" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    return json({
      success: true,
      label_url: printData.url,
      tracking_code: trackingCode,
      melhor_envio_id: cartItemId,
    });
  } catch (error: any) {
    console.error("Error generating shipping label", error?.message || error);
    return json({ error: error?.message || "Failed to generate label" }, 500);
  }
});
