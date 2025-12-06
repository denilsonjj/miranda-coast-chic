import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Mercado Pago sends notifications via GET or POST
    // We need to check the topic parameter to know what type of notification it is
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const resourceId = url.searchParams.get('id');

    console.log('Webhook received - Topic:', topic, 'Resource ID:', resourceId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle payment notifications
    if (topic === 'payment' || topic === 'merchant_order') {
      const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

      if (!mercadoPagoToken) {
        throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      }

      // Get payment details from Mercado Pago API
      let paymentData: any;

      if (topic === 'payment') {
        // For payment topic, resourceId is the payment ID
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mercadoPagoToken}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch payment details:', response.statusText);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to fetch payment details' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        paymentData = await response.json();
      } else if (topic === 'merchant_order') {
        // For merchant_order topic, resourceId is the merchant order ID
        const response = await fetch(`https://api.mercadopago.com/merchant_orders/${resourceId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mercadoPagoToken}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch merchant order details:', response.statusText);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to fetch merchant order details' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        paymentData = await response.json();
      }

      console.log('Payment data received:', JSON.stringify(paymentData, null, 2));

      // Extract external reference (our order ID) from payment data
      let externalReference: string | null = null;
      let status: string | null = null;

      if (topic === 'payment' && paymentData.external_reference) {
        externalReference = paymentData.external_reference;
        status = paymentData.status; // e.g., 'approved', 'pending', 'rejected', 'cancelled'
      } else if (topic === 'merchant_order' && paymentData.external_reference) {
        externalReference = paymentData.external_reference;
        // For merchant orders, check the payment status
        if (paymentData.payments && paymentData.payments.length > 0) {
          const lastPayment = paymentData.payments[paymentData.payments.length - 1];
          status = lastPayment.status;
        }
      }

      if (!externalReference) {
        console.warn('No external reference found in payment data');
        return new Response(
          JSON.stringify({ success: true, message: 'No external reference' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      console.log('Processing order:', externalReference, 'with status:', status);

      // Only update order status if payment is approved
      if (status === 'approved') {
        const { data, error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed', // Change order status to confirmed
            updated_at: new Date().toISOString(),
          })
          .eq('id', externalReference);

        if (error) {
          console.error('Error updating order:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        console.log('Order updated successfully:', externalReference);

        return new Response(
          JSON.stringify({ success: true, message: 'Order status updated to paid' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else if (status === 'pending') {
        // Update to pending payment status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', externalReference);

        if (error) {
          console.error('Error updating order to pending:', error);
        }

        console.log('Order payment pending:', externalReference);

        return new Response(
          JSON.stringify({ success: true, message: 'Order payment pending' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else if (status === 'rejected' || status === 'cancelled') {
        // Update to failed payment status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', externalReference);

        if (error) {
          console.error('Error updating order to failed:', error);
        }

        console.log('Order payment failed/rejected:', externalReference);

        return new Response(
          JSON.stringify({ success: true, message: 'Order payment failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Webhook processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Unknown topic
    console.log('Unknown webhook topic:', topic);
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received but not processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
