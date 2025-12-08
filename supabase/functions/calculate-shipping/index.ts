import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface ShippingProduct {
  width: number;
  height: number;
  length: number;
  weight: number;
  quantity: number;
}

interface ShippingRequest {
  from_postal_code: string;
  to_postal_code: string;
  products: ShippingProduct[];
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const MELHOR_ENVIO_API_KEY = Deno.env.get("MELHOR_ENVIO_API_KEY");

    if (!MELHOR_ENVIO_API_KEY) {
      console.error("MELHOR_ENVIO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Shipping service not configured" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const body = (await req.json()) as Partial<ShippingRequest>;

    if (
      !body ||
      typeof body.from_postal_code !== "string" ||
      typeof body.to_postal_code !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const from_postal_code = body.from_postal_code;
    const to_postal_code = body.to_postal_code;
    const products = Array.isArray(body.products) ? body.products : [];

    console.log("Calculating shipping:", {
      from_postal_code,
      to_postal_code,
      products,
    });

    const defaultPackage = {
      width: 20,
      height: 5,
      length: 30,
      weight: 0.3,
    };

    let totalWeight = 0;
    let maxWidth = defaultPackage.width;
    let maxLength = defaultPackage.length;
    let totalHeight = 0;

    if (products.length > 0) {
      products.forEach((p) => {
        const qty = p.quantity || 1;
        totalWeight += (p.weight || defaultPackage.weight) * qty;
        maxWidth = Math.max(maxWidth, p.width || defaultPackage.width);
        maxLength = Math.max(maxLength, p.length || defaultPackage.length);
        totalHeight += (p.height || defaultPackage.height) * qty;
      });
    } else {
      totalWeight = defaultPackage.weight;
      totalHeight = defaultPackage.height;
    }

    const response = await fetch(
      "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${MELHOR_ENVIO_API_KEY}`,
          "User-Agent": "Miranda Costa (contato@mirandacosta.com.br)",
        },
        body: JSON.stringify({
          from: {
            postal_code: from_postal_code.replace(/\D/g, ""),
          },
          to: {
            postal_code: to_postal_code.replace(/\D/g, ""),
          },
          products: [
            {
              id: "1",
              width: maxWidth,
              height: Math.min(totalHeight, 100),
              length: maxLength,
              weight: totalWeight,
              insurance_value: 100,
              quantity: 1,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Melhor Envio API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `Shipping API error: ${response.status}`,
        }),
        { status: 502, headers: corsHeaders },
      );
    }

    const shippingOptions = await response.json();
    console.log("Shipping options received:", shippingOptions);

    const allowedNames = ["sedex", "pac"];

    const validOptions = (Array.isArray(shippingOptions)
      ? shippingOptions
      : []
    )
      .filter((option: any) => {
        if (!option || option.error || !option.price) return false;
        const company = (option.company?.name || option.company || "")
          .toLowerCase();
        const name = (option.name || "").toLowerCase();
        const isCorreios = company.includes("correios") ||
          name.includes("correios");
        const isAllowedService = allowedNames.some((n) => name.includes(n));
        return isCorreios && isAllowedService;
      })
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

    const pickupOption = {
      id: "pickup",
      name: "Retirar na loja",
      company: "Miranda Costa Boutique",
      price: 0,
      delivery_time: 0,
      delivery_range: { min: 0, max: 0 },
      currency: "BRL",
      pickup: true,
      address: {
        name: "Miranda Costa Boutique",
        street: "Rua Licurana",
        number: "806",
        district: "Tabuleiro",
        city: "Camboriú",
        state: "SC",
        postal_code: "88348225",
        phone: "",
      },
    };

    const optionsWithPickup = [...validOptions, pickupOption];

    return new Response(
      JSON.stringify({ options: optionsWithPickup }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: any) {
    console.error("Error calculating shipping:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to calculate shipping",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
