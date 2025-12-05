import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LabelRequest {
  order_id: string;
  service_id: number;
  from: {
    name: string;
    phone: string;
    email: string;
    document: string;
    address: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state_abbr: string;
    postal_code: string;
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MELHOR_ENVIO_API_KEY = Deno.env.get("MELHOR_ENVIO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MELHOR_ENVIO_API_KEY) {
      throw new Error("MELHOR_ENVIO_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { order_id, service_id, from }: LabelRequest = await req.json();

    console.log("Generating label for order:", order_id);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    const shippingAddress = order.shipping_address as any;

    // Calculate total dimensions (simplified)
    const totalItems = order.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const packageData = {
      width: 20,
      height: Math.min(5 * totalItems, 100),
      length: 30,
      weight: 0.3 * totalItems,
    };

    // 1. Add item to cart
    const cartResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/cart", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_API_KEY}`,
        "User-Agent": "Miranda Costa (contato@mirandacosta.com.br)"
      },
      body: JSON.stringify({
        service: service_id,
        from: {
          name: from.name,
          phone: from.phone,
          email: from.email,
          document: from.document,
          address: from.address,
          number: from.number,
          complement: from.complement || "",
          district: from.district,
          city: from.city,
          state_abbr: from.state_abbr,
          postal_code: from.postal_code.replace(/\D/g, ""),
        },
        to: {
          name: shippingAddress.name || "Cliente",
          phone: shippingAddress.phone || "",
          email: shippingAddress.email || "",
          document: shippingAddress.document || "",
          address: shippingAddress.street,
          number: shippingAddress.number,
          complement: shippingAddress.complement || "",
          district: shippingAddress.neighborhood,
          city: shippingAddress.city,
          state_abbr: shippingAddress.state,
          postal_code: shippingAddress.cep.replace(/\D/g, ""),
        },
        products: [{
          name: `Pedido #${order_id.slice(0, 8)}`,
          quantity: 1,
          unitary_value: order.subtotal,
        }],
        volumes: [{
          ...packageData,
          insurance_value: order.subtotal,
        }],
        options: {
          insurance_value: order.subtotal,
          receipt: false,
          own_hand: false,
          collect: false,
        },
      }),
    });

    if (!cartResponse.ok) {
      const errorText = await cartResponse.text();
      console.error("Cart API error:", cartResponse.status, errorText);
      throw new Error(`Failed to add to cart: ${errorText}`);
    }

    const cartData = await cartResponse.json();
    console.log("Cart response:", cartData);

    const cartItemId = cartData.id;

    // 2. Checkout (pay for the label)
    const checkoutResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/checkout", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_API_KEY}`,
        "User-Agent": "Miranda Costa (contato@mirandacosta.com.br)"
      },
      body: JSON.stringify({
        orders: [cartItemId],
      }),
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error("Checkout API error:", checkoutResponse.status, errorText);
      throw new Error(`Failed to checkout: ${errorText}`);
    }

    const checkoutData = await checkoutResponse.json();
    console.log("Checkout response:", checkoutData);

    // 3. Generate label
    const generateResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/generate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_API_KEY}`,
        "User-Agent": "Miranda Costa (contato@mirandacosta.com.br)"
      },
      body: JSON.stringify({
        orders: [cartItemId],
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("Generate API error:", generateResponse.status, errorText);
      throw new Error(`Failed to generate label: ${errorText}`);
    }

    const generateData = await generateResponse.json();
    console.log("Generate response:", generateData);

    // 4. Print label (get PDF URL)
    const printResponse = await fetch(`https://www.melhorenvio.com.br/api/v2/me/shipment/print`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_API_KEY}`,
        "User-Agent": "Miranda Costa (contato@mirandacosta.com.br)"
      },
      body: JSON.stringify({
        mode: "public",
        orders: [cartItemId],
      }),
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      console.error("Print API error:", printResponse.status, errorText);
      throw new Error(`Failed to print label: ${errorText}`);
    }

    const printData = await printResponse.json();
    console.log("Print response:", printData);

    // 5. Get tracking code
    const trackingResponse = await fetch(`https://www.melhorenvio.com.br/api/v2/me/shipment/tracking`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_API_KEY}`,
        "User-Agent": "Miranda Costa (contato@mirandacosta.com.br)"
      },
      body: JSON.stringify({
        orders: [cartItemId],
      }),
    });

    let trackingCode = null;
    if (trackingResponse.ok) {
      const trackingData = await trackingResponse.json();
      trackingCode = trackingData[cartItemId]?.tracking || null;
      console.log("Tracking code:", trackingCode);
    }

    // 6. Update order with tracking code
    if (trackingCode) {
      await supabase
        .from('orders')
        .update({ tracking_code: trackingCode, status: 'shipped' })
        .eq('id', order_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        label_url: printData.url,
        tracking_code: trackingCode,
        melhor_envio_id: cartItemId,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error generating label:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate label" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
