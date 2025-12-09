import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!accessToken) {
      console.error("MERCADO_PAGO_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({
          error: "Payment gateway not configured: defina MERCADO_PAGO_ACCESS_TOKEN nos secrets",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));

    const {
      items,
      payer,
      external_reference,
      back_urls,
      payment_method_id,
      token,
      installments,
      shipping_cost,
    } = body;

    // Nome do pagador dividido em primeiro e último nome para MP (ex.: boleto requer)
    const payerName: string = payer?.name || "Cliente";
    const nameParts = payerName.trim().split(" ");
    const firstName = payer?.first_name || nameParts.shift() || payerName;
    const lastName = payer?.last_name || nameParts.join(" ") || payerName;

    // Inclui frete (quando houver) no cálculo e envio ao MP
    const shippingAmount = Number(shipping_cost) > 0 ? Number(shipping_cost) : 0;
    const itemsWithShipping = [
      ...items,
      ...(shippingAmount > 0
        ? [{
            id: "shipping",
            title: "Frete",
            description: "Frete",
            quantity: 1,
            unit_price: Math.round(Number(shippingAmount) * 100) / 100,
          }]
        : []),
    ];

    const isPreferenceFlow = !payment_method_id;

    // Detecta método de pagamento
    const isBoleto = payment_method_id?.toLowerCase?.().includes("bol");
    const isCard = !!payment_method_id && !isBoleto && payment_method_id?.toLowerCase?.() !== "pix";

    // Endereço do pagador (obrigatório para boleto)
    const payerAddress = payer?.address || {};
    const boletoAddress =
      payerAddress && {
        zip_code: (payerAddress.zip_code || payerAddress.postal_code || "").toString().replace(/\D/g, ""),
        street_name: payerAddress.street_name || payerAddress.street || "",
        street_number: (payerAddress.street_number || payerAddress.number || "").toString(),
        neighborhood: payerAddress.neighborhood || "",
        city: payerAddress.city || "",
        federal_unit: payerAddress.federal_unit || payerAddress.state || "",
      };

    // Validação mínima para cartão: token obrigatório
    if (isCard && !token) {
      return new Response(
        JSON.stringify({ error: "Cartão: token não recebido do frontend. Gere o token antes de pagar." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Validação mínima para boleto: endereço obrigatório
    if (
      isBoleto &&
      (!boletoAddress ||
        !boletoAddress.zip_code ||
        !boletoAddress.street_name ||
        !boletoAddress.city ||
        !boletoAddress.federal_unit)
    ) {
      return new Response(
        JSON.stringify({
          error: "Boleto: endereço do pagador incompleto. Envie zip_code, street_name, street_number, city, federal_unit.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    if (
      !itemsWithShipping ||
      !Array.isArray(itemsWithShipping) ||
      itemsWithShipping.length === 0 ||
      !payer ||
      !external_reference
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: items (array), payer, external_reference",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const invalidItem = itemsWithShipping.find(
      (item: any) =>
        !item.title ||
        !item.quantity ||
        Number(item.quantity) <= 0 ||
        item.unit_price === undefined ||
        isNaN(Number(item.unit_price)),
    );
    if (invalidItem) {
      return new Response(
        JSON.stringify({
          error: "Invalid item payload: title, quantity (>0) e unit_price numérico são obrigatórios",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const requestOrigin = req.headers.get("origin") || "";
    const requestUrlOrigin = new URL(req.url).origin || "";
    const envBase = Deno.env.get("PUBLIC_SITE_URL") || "";
    const baseUrl =
      (back_urls?.success && back_urls.success.trim()) ||
      (back_urls?.failure && back_urls.failure.trim()) ||
      (back_urls?.pending && back_urls.pending.trim()) ||
      envBase ||
      requestOrigin ||
      requestUrlOrigin ||
      "https://example.com";

    // Recomendação do MP: usar idempotência para evitar cobranças duplicadas
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${external_reference}-${Date.now()}`;

    if (isPreferenceFlow) {
      console.log("Creating payment preference for:", external_reference);
      console.log("Items:", JSON.stringify(itemsWithShipping));

      const preferenceData = {
        items: itemsWithShipping.map((item: any) => ({
          id: item.id || item.product_name,
          title: item.title || item.product_name,
          description: item.description || item.title || "Produto",
          picture_url: item.picture_url,
          quantity: item.quantity,
          currency_id: "BRL",
          unit_price: parseFloat(item.unit_price),
        })),
        payer: {
          email: payer.email || "",
          name: payerName || "Cliente",
        },
        back_urls: {
          success: back_urls?.success?.trim() || `${baseUrl}/pedido/${external_reference}`,
          failure: back_urls?.failure?.trim() || `${baseUrl}/pedido/${external_reference}`,
          pending: back_urls?.pending?.trim() || `${baseUrl}/pedido/${external_reference}`,
        },
        auto_return: "approved",
        external_reference,
        statement_descriptor: "MIRANDA COAST",
        notification_url: back_urls?.notification || baseUrl,
      };

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(preferenceData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Mercado Pago API error:", JSON.stringify(data));
        return new Response(
          JSON.stringify({
            error: data.message || "Failed to create payment preference",
            details: data,
            status: response.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status },
        );
      }

      console.log("Payment preference created:", data.id);

      return new Response(
        JSON.stringify({
          id: data.id,
          init_point: data.init_point,
          sandbox_init_point: data.sandbox_init_point,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    } else {
      const transactionAmount = itemsWithShipping.reduce(
        (sum: number, item: any) => sum + Number(item.unit_price) * Number(item.quantity),
        0,
      );
      const normalizedTransactionAmount = Math.round(transactionAmount * 100) / 100;
      console.log("Items with shipping:", JSON.stringify(itemsWithShipping));
      console.log("Calculated transaction_amount:", normalizedTransactionAmount);

      console.log("Creating direct payment for:", external_reference, "method:", payment_method_id);

      const paymentPayload: any = {
        transaction_amount: normalizedTransactionAmount,
        description: items?.[0]?.title || "Pedido",
        payment_method_id,
        payer: {
          email: payer.email || "",
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: payer.document_type || "CPF",
            number: payer.document || "",
          },
          ...(isBoleto && boletoAddress
            ? {
                address: boletoAddress,
              }
            : {}),
        },
        external_reference,
        statement_descriptor: payer.statement_descriptor || "MIRANDA COAST",
        notification_url: back_urls?.notification?.trim() || baseUrl,
        additional_info: {
          items: itemsWithShipping.map((item: any) => ({
            id: item.id || item.product_name,
            title: item.title || item.product_name,
            description: item.description || item.title || "Produto",
            picture_url: item.picture_url,
            quantity: item.quantity,
            unit_price: Math.round(Number(item.unit_price) * 100) / 100,
          })),
        },
      };

      if (token) {
        paymentPayload.token = token;
      }

      if (installments) {
        paymentPayload.installments = Number(installments);
      }

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
        console.error("Mercado Pago API error:", JSON.stringify(data));
        return new Response(
          JSON.stringify({
            error: data.message || "Failed to create payment",
            details: data,
            status: response.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status },
        );
      }

      console.log("Payment created:", data.id, data.status);

      // Atualiza pedido com o status inicial e o id do pagamento
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          let payment_status: string = "pending";
          let status: string = "pending";
          if (data.status === "approved") {
            payment_status = "paid";
            status = "confirmed";
          } else if (data.status === "rejected" || data.status === "cancelled") {
            payment_status = "failed";
            status = "failed";
          }

          await supabase
            .from("orders")
            .update({
              payment_status,
              status,
              mercado_pago_payment_id: data.id?.toString?.() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", external_reference);
        } catch (err) {
          console.error("Error updating order status after payment:", err);
        }
      }

      return new Response(
        JSON.stringify({
          id: data.id,
          status: data.status,
          status_detail: data.status_detail,
          point_of_interaction: data.point_of_interaction,
          qr_code: data.point_of_interaction?.transaction_data?.qr_code || null,
          qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
          ticket_url: data.point_of_interaction?.transaction_data?.ticket_url || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
