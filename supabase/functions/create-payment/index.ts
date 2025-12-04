import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      throw new Error('Payment gateway not configured');
    }

    const { items, payer, external_reference, back_urls } = await req.json();

    console.log('Creating payment preference for:', external_reference);
    console.log('Items:', JSON.stringify(items));

    const preferenceData = {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || item.title,
        picture_url: item.picture_url,
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: item.unit_price,
      })),
      payer: {
        email: payer.email,
        name: payer.name || '',
      },
      back_urls: {
        success: back_urls.success,
        failure: back_urls.failure,
        pending: back_urls.pending,
      },
      auto_return: 'approved',
      external_reference,
      statement_descriptor: 'MIRANDA COSTA',
      notification_url: back_urls.notification,
    };

    console.log('Preference data:', JSON.stringify(preferenceData));

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago API error:', JSON.stringify(data));
      throw new Error(data.message || 'Failed to create payment preference');
    }

    console.log('Payment preference created:', data.id);

    return new Response(
      JSON.stringify({
        id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
