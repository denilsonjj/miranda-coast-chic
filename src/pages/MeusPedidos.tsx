import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ShoppingBag, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Aguardando Pagamento',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const MeusPedidos = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handlePayOrder = async (orderId: string, total: number) => {
    try {
      const baseUrl = window.location.origin;
      
      // Get order items for payment
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: {
          items: orderItems?.map(item => ({
            id: item.product_id,
            title: item.product_name,
            quantity: item.quantity,
            unit_price: Number(item.price),
            picture_url: item.product_image || '',
          })) || [],
          payer: {
            email: user!.email,
            name: user!.user_metadata?.full_name || '',
          },
          external_reference: orderId,
          back_urls: {
            success: `${baseUrl}/pedido/${orderId}?status=success`,
            failure: `${baseUrl}/pedido/${orderId}?status=failure`,
            pending: `${baseUrl}/pedido/${orderId}?status=pending`,
          },
        },
      });

      if (paymentError) {
        console.error('Payment error:', paymentError);
        toast.error('Erro ao criar pagamento. Tente novamente.');
        return;
      }

      const redirectUrl = paymentData.sandbox_init_point || paymentData.init_point;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        toast.error('Erro ao obter link de pagamento');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Erro ao processar pagamento');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-4xl px-4">
        <h1 className="text-3xl md:text-4xl font-serif mb-8">Meus Pedidos</h1>
        
        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">Nenhum pedido encontrado</h2>
              <p className="text-muted-foreground mb-6">Você ainda não fez nenhum pedido</p>
              <Button onClick={() => navigate('/loja')}>Ir para a Loja</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <Card key={order.id} className="hover:shadow-medium transition-smooth">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg font-medium">
                      Pedido #{order.id.slice(0, 8)}
                    </CardTitle>
                    <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {order.tracking_code ? `Rastreio: ${order.tracking_code}` : 'Aguardando envio'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-primary">{formatPrice(order.total)}</p>
                      <Link to={`/pedido/${order.id}`}>
                        <Button variant="outline" size="sm" className="mt-2">
                          Ver Detalhes
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeusPedidos;
