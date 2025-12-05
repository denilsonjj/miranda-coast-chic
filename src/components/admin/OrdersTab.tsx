import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Printer, Package, Eye, Truck, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  tracking_code: string | null;
  shipping_address: any;
  shipping_service: any;
  order_items: any[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  paid: "bg-blue-500",
  processing: "bg-purple-500",
  shipped: "bg-green-500",
  delivered: "bg-green-700",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  processing: "Processando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Aguardando",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export const OrdersTab = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [labelDialog, setLabelDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sender info for labels (store info)
  const [senderInfo] = useState({
    name: "Miranda Costa",
    phone: "11999999999",
    email: "contato@mirandacosta.com.br",
    document: "00000000000000",
    address: "Rua Exemplo",
    number: "123",
    complement: "",
    district: "Centro",
    city: "São Paulo",
    state_abbr: "SP",
    postal_code: "01001000",
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const updateTrackingCode = useMutation({
    mutationFn: async ({ orderId, trackingCode }: { orderId: string; trackingCode: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_code: trackingCode })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Código de rastreio atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar código: ' + error.message);
    },
  });

  const generateLabel = useMutation({
    mutationFn: async ({ orderId, serviceId }: { orderId: string; serviceId: number }) => {
      const { data, error } = await supabase.functions.invoke('generate-shipping-label', {
        body: {
          order_id: orderId,
          service_id: serviceId,
          from: senderInfo,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (data.label_url) {
        window.open(data.label_url, '_blank');
        toast.success('Etiqueta gerada com sucesso!');
      }
      if (data.tracking_code) {
        toast.success(`Código de rastreio: ${data.tracking_code}`);
      }
      setLabelDialog(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao gerar etiqueta: ' + error.message);
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsDialog(true);
  };

  const openLabelDialog = (order: Order) => {
    setSelectedOrder(order);
    setLabelDialog(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pedidos ({orders.length})
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</p>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">#{order.id.slice(0, 8)}</p>
                    <p className="text-sm">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                    <Badge variant="outline">
                      Pagamento: {paymentStatusLabels[order.payment_status || 'pending']}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.shipping_address?.name || 'Cliente'}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_items?.length || 0} item(s) • {formatPrice(order.total)}
                    </p>
                    {order.tracking_code && (
                      <p className="text-sm text-primary flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {order.tracking_code}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDetails(order)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    {order.payment_status === 'approved' && !order.tracking_code && (
                      <Button size="sm" onClick={() => openLabelDialog(order)}>
                        <Printer className="h-4 w-4 mr-1" />
                        Etiqueta
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Details Dialog */}
        <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status do Pedido</Label>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(v) => updateStatus.mutate({ orderId: selectedOrder.id, status: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="processing">Processando</SelectItem>
                        <SelectItem value="shipped">Enviado</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Código de Rastreio</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite o código"
                        defaultValue={selectedOrder.tracking_code || ''}
                        onBlur={(e) => {
                          if (e.target.value !== selectedOrder.tracking_code) {
                            updateTrackingCode.mutate({ orderId: selectedOrder.id, trackingCode: e.target.value });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Itens do Pedido</Label>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                        {item.product_image && (
                          <img src={item.product_image} alt="" className="w-12 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.size && `Tam: ${item.size}`} {item.color && `• Cor: ${item.color}`} • Qtd: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Endereço de Entrega</Label>
                    <div className="text-sm space-y-1 p-3 bg-muted rounded">
                      <p className="font-medium">{selectedOrder.shipping_address?.name}</p>
                      <p>{selectedOrder.shipping_address?.street}, {selectedOrder.shipping_address?.number}</p>
                      {selectedOrder.shipping_address?.complement && (
                        <p>{selectedOrder.shipping_address.complement}</p>
                      )}
                      <p>{selectedOrder.shipping_address?.neighborhood}</p>
                      <p>{selectedOrder.shipping_address?.city} - {selectedOrder.shipping_address?.state}</p>
                      <p>CEP: {selectedOrder.shipping_address?.cep}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Resumo</Label>
                    <div className="text-sm space-y-2 p-3 bg-muted rounded">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatPrice(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frete:</span>
                        <span>{formatPrice(selectedOrder.shipping_cost)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatPrice(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.shipping_service && (
                  <div>
                    <Label className="mb-2 block">Serviço de Envio Selecionado</Label>
                    <div className="text-sm p-3 bg-muted rounded">
                      <p className="font-medium">{selectedOrder.shipping_service.name}</p>
                      <p className="text-muted-foreground">
                        {selectedOrder.shipping_service.company} • 
                        Prazo: {selectedOrder.shipping_service.delivery_time} dias úteis
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Label Generation Dialog */}
        <Dialog open={labelDialog} onOpenChange={setLabelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Etiqueta de Envio</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pedido: #{selectedOrder.id.slice(0, 8)}
                </p>
                <p className="text-sm">
                  Destino: {selectedOrder.shipping_address?.city} - {selectedOrder.shipping_address?.state}
                </p>
                
                {selectedOrder.shipping_service ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">{selectedOrder.shipping_service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.shipping_service.company} • {formatPrice(selectedOrder.shipping_service.price || selectedOrder.shipping_cost)}
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => generateLabel.mutate({
                        orderId: selectedOrder.id,
                        serviceId: selectedOrder.shipping_service.id,
                      })}
                      disabled={generateLabel.isPending}
                    >
                      {generateLabel.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      <Printer className="h-4 w-4 mr-2" />
                      Gerar e Imprimir Etiqueta
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      O valor do frete será debitado do seu saldo no Melhor Envio
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Este pedido não tem um serviço de envio selecionado.
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
