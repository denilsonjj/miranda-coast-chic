import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface ShippingRequest {
  from_postal_code: string;
  to_postal_code: string;
  products: {
    width: number;
    height: number;
    length: number;
    weight: number;
    quantity: number;
  }[];
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MELHOR_ENVIO_API_KEY = Deno.env.get("MELHOR_ENVIO_API_KEY");
    
    if (!MELHOR_ENVIO_API_KEY) {
      console.error("MELHOR_ENVIO_API_KEY not configured");
      throw new Error("Shipping service not configured");
    }

    const { from_postal_code, to_postal_code, products }: ShippingRequest = await req.json();

    console.log("Calculating shipping:", { from_postal_code, to_postal_code, products });

    // Default package dimensions for clothing items
    const defaultPackage = {
      width: 20,
      height: 5,
      length: 30,
      weight: 0.3,
    };

    // Calculate total dimensions
    let totalWeight = 0;
    let maxWidth = defaultPackage.width;
    let maxLength = defaultPackage.length;
    let totalHeight = 0;

    if (products && products.length > 0) {
      products.forEach(p => {
        totalWeight += (p.weight || defaultPackage.weight) * (p.quantity || 1);
        maxWidth = Math.max(maxWidth, p.width || defaultPackage.width);
        maxLength = Math.max(maxLength, p.length || defaultPackage.length);
        totalHeight += (p.height || defaultPackage.height) * (p.quantity || 1);
      });
    } else {
      totalWeight = defaultPackage.weight;
      totalHeight = defaultPackage.height;
    }

    // Melhor Envio API call
    const response = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_API_KEY}`,
        "User-Agent": "Miranda Costa (contato@mirandacosta.com.br)"
      },
      body: JSON.stringify({
        from: {
          postal_code: from_postal_code.replace(/\D/g, ""),
        },
        to: {
          postal_code: to_postal_code.replace(/\D/g, ""),
        },
        products: [{
          id: "1",
          width: maxWidth,
          height: Math.min(totalHeight, 100),
          length: maxLength,
          weight: totalWeight,
          insurance_value: 100,
          quantity: 1,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Melhor Envio API error:", response.status, errorText);
      throw new Error(`Shipping API error: ${response.status}`);
    }

    const shippingOptions = await response.json();
    console.log("Shipping options received:", shippingOptions);

    // Filter and format valid options
    const validOptions = shippingOptions
      .filter((option: any) => !option.error && option.price)
      .map((option: any) => ({
        id: option.id,
        name: option.name,
        company: option.company?.name || option.name,
        price: parseFloat(option.price),
        delivery_time: option.delivery_time,
        delivery_range: option.delivery_range,
        currency: "BRL",
      }))
      .sort((a: any, b: any) => a.price - b.price);

    return new Response(JSON.stringify({ options: validOptions }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error: any) {
    console.error("Error calculating shipping:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to calculate shipping" }),
      { status: 500, headers: corsHeaders }
    );
  }
});