import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Package, MapPin, Truck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

interface Order {
  id: string;
  status: string;
  payment_status: string;
  shipping_status?: string;
  subtotal: number;
  shipping_cost: number;
  discount_total?: number;
  coupon_code?: string | null;
  total: number;
  shipping_address: {
    name?: string;
    document?: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  };
  shipping_service: {
    name: string;
    company: string;
    delivery_time: number;
  } | null;
  tracking_code: string | null;
  created_at: string;
  items: OrderItem[];
}

const Pedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const defaultWebhook = supabaseUrl
    ? `${supabaseUrl.replace('.supabase.co', '.functions.supabase.co')}/payment-webhook`
    : '';
  const webhookUrl =
    import.meta.env.VITE_MERCADO_PAGO_WEBHOOK_URL ||
    defaultWebhook ||
    `${window.location.origin}/api/webhook/mercado-pago`;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || !user) return;
      
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (orderError) throw orderError;
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', id);
        
        if (itemsError) throw itemsError;
        
        setOrder({
          ...orderData,
          shipping_address: orderData.shipping_address as Order['shipping_address'],
          shipping_service: orderData.shipping_service as Order['shipping_service'],
          items: itemsData,
          discount_total: (orderData as any).discount_total ?? 0,
          coupon_code: (orderData as any).coupon_code || null,
        });
      } catch (error) {
        console.error('Error fetching order:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrder();
  }, [id, user, navigate]);

  // Polling simples para atualizar status de pagamento enquanto pendente
  useEffect(() => {
    if (!id || !user) return;
    if (!order || order.payment_status !== 'pending') return;

    const interval = setInterval(async () => {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (orderError || !orderData) return;

      setOrder({
        ...orderData,
        shipping_address: orderData.shipping_address as Order['shipping_address'],
        shipping_service: orderData.shipping_service as Order['shipping_service'],
        items: order?.items || [],
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [id, user, order]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const shippingStatusLabel = (status?: string) => {
    if (!status) return { label: 'Aguardando geração da etiqueta', color: 'bg-yellow-100 text-yellow-700' };
    const normalized = status.toLowerCase();
    if (normalized.includes('posted') || normalized.includes('postado')) {
      return { label: 'Postado', color: 'bg-blue-100 text-blue-700' };
    }
    if (normalized.includes('delivered')) {
      return { label: 'Entregue', color: 'bg-green-100 text-green-700' };
    }
    if (normalized.includes('canceled')) {
      return { label: 'Cancelado', color: 'bg-red-100 text-red-700' };
    }
    if (normalized.includes('generated') || normalized.includes('gerada')) {
      return { label: 'Etiqueta gerada', color: 'bg-indigo-100 text-indigo-700' };
    }
    return { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const handlePayWithMercadoPago = async () => {
    if (!order) return;

    const invalidItem = order.items.find(
      (item) =>
        !item.product_name ||
        !item.quantity ||
        Number(item.quantity) <= 0 ||
        item.price === undefined ||
        Number(item.price) <= 0
    );
    if (invalidItem) {
      toast.error(
        'Itens do pedido inválidos para pagamento (nome, quantidade > 0 e preço > 0 são obrigatórios).'
      );
      return;
    }
    
    setIsPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          external_reference: order.id,
          items: order.items.map(item => ({
            id: item.id,
            title: item.product_name,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.price) || 0,
            picture_url: item.product_image || undefined,
          })),
          payer: {
            email: user?.email || '',
            name: user?.email?.split('@')[0] || 'Cliente',
          },
          back_urls: {
            success: `${window.location.origin}/pedido/${order.id}`,
            failure: `${window.location.origin}/pedido/${order.id}`,
            pending: `${window.location.origin}/pedido/${order.id}`,
            notification: webhookUrl,
          },
        },
      });

      if (error) {
        console.error('Payment error:', error);
        toast.error(error.message || 'Erro ao processar pagamento. Verifique os dados e tente novamente.');
        setIsPaymentLoading(false);
        return;
      }

      if (data?.error) {
        console.error('Payment backend error:', data);
        toast.error(data.error || 'Erro ao processar pagamento. Verifique as credenciais do Mercado Pago.');
        setIsPaymentLoading(false);
        return;
      }

      if (data?.init_point) {
        // Redirecionar para Mercado Pago
        window.location.href = data.init_point;
      } else if (data?.sandbox_init_point) {
        // Usar sandbox em modo teste
        window.location.href = data.sandbox_init_point;
      } else {
        toast.error('Erro ao processar pagamento. Tente novamente.');
        setIsPaymentLoading(false);
      }
    } catch (error: any) {
      console.error('Payment creation error:', error);
      // Tentar extrair mensagem detalhada da função edge (Supabase FunctionsHttpError)
      try {
        const contextResponse = (error as any)?.context?.response;
        if (contextResponse?.json) {
          const json = await contextResponse.json();
          if (json?.error) {
            toast.error(json.error);
          } else {
            toast.error(error.message || 'Erro ao processar pagamento');
          }
        } else if (contextResponse?.text) {
          const text = await contextResponse.text();
          toast.error(text || 'Erro ao processar pagamento');
        } else {
          toast.error(error.message || 'Erro ao processar pagamento');
        }
      } catch {
        toast.error(error.message || 'Erro ao processar pagamento');
      }
      setIsPaymentLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Pedido não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-secondary/20">
      <div className="container max-w-3xl px-4">
        {/* Success message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">Obrigado por comprar conosco</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-serif">Pedido #{order.id.slice(0, 8)}</CardTitle>
              <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Items */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Itens do Pedido
              </h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      {(item.size || item.color) && (
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Tam: ${item.size}`}
                          {item.size && item.color && ' | '}
                          {item.color && `Cor: ${item.color}`}
                        </p>
                      )}
                      <p className="text-sm">
                        Qtd: {item.quantity} — {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping address */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de Entrega
              </h3>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="font-medium">{order.shipping_address.name || 'Cliente'}</p>
                <p>{order.shipping_address.street}, {order.shipping_address.number}</p>
                {order.shipping_address.complement && <p>{order.shipping_address.complement}</p>}
                <p>{order.shipping_address.neighborhood}</p>
                <p>{order.shipping_address.city} - {order.shipping_address.state}</p>
                <p>CEP: {order.shipping_address.cep}</p>
                {order.shipping_address.document && (
                  <p>Documento: {order.shipping_address.document}</p>
                )}
              </div>
            </div>

            {/* Shipping info */}
            {order.shipping_service && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Envio
                </h3>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="font-medium">
                    {order.shipping_service.company} - {order.shipping_service.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Previsão de entrega: {order.shipping_service.delivery_time} dias úteis
                  </p>
                  {order.tracking_code && (
                    <p className="text-sm mt-2">
                      Código de rastreio:{' '}
                      <span className="font-mono">{order.tracking_code}</span>
                    </p>
                  )}
                  {!order.tracking_code && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      Rastreio será exibido aqui após a geração da etiqueta.
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-sm">Status do envio:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${shippingStatusLabel(order.shipping_status).color}`}
                    >
                      {shippingStatusLabel(order.shipping_status).label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    As atualizações de envio ficam na aba <strong>Meus Pedidos</strong>. Volte lá
                    para acompanhar o rastreamento.
                  </p>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount_total && order.discount_total > 0 && (
                <div className="flex justify-between text-green-700 text-sm">
                  <span>Desconto {order.coupon_code ? `(Cupom: ${order.coupon_code})` : ""}</span>
                  <span>- {formatPrice(order.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Frete</span>
                <span>{formatPrice(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment status card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Status de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Pagamento:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  order.payment_status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : order.payment_status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {order.payment_status === 'paid' && 'Pagamento realizado'}
                {order.payment_status === 'pending' && 'Pendente'}
                {order.payment_status === 'failed' && 'Falha'}
              </span>
            </div>

            {order.payment_status === 'pending' && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Escolha sua forma de pagamento. Você será redirecionado para o Mercado Pago de forma
                  segura.
                </p>
                <p className="text-sm text-muted-foreground">
                  Se o pagamento foi iniciado na tela anterior (Pix/Boleto/Cartão), aguarde a
                  confirmação. Caso queira tentar de novo, volte ao checkout.
                </p>
              </div>
            )}

            {order.payment_status === 'paid' && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  Seu pagamento foi processado com sucesso!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="p-4 mb-6 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
          As atualizações de pagamento e envio ficam na aba <strong>Meus Pedidos</strong>. Volte lá
          para acompanhar o status e o rastreio do seu pedido.
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button variant="outline" onClick={() => navigate('/loja')}>
            Continuar Comprando
          </Button>
          <Button onClick={() => navigate('/meus-pedidos')}>
            Ver Meus Pedidos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pedido;
