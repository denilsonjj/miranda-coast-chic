import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Package, MapPin, CreditCard, Check } from 'lucide-react';

interface ShippingOption {
  id: string;
  name: string;
  company: string;
  price: number;
  delivery_time: number;
  delivery_range: { min: number; max: number };
}

interface Address {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const ORIGIN_CEP = '01310100'; // São Paulo - Av Paulista

const Checkout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, cartTotal, clearCart, isLoading: cartLoading } = useCart();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Address state
  const [address, setAddress] = useState<Address>({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  
  // Shipping state
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!cartLoading && cartItems.length === 0 && user) {
      navigate('/loja');
      toast.error('Seu carrinho está vazio');
    }
  }, [cartItems, cartLoading, user, navigate]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  };

  const calculateShipping = async () => {
    if (!address.cep || address.cep.replace(/\D/g, '').length !== 8) {
      toast.error('Por favor, informe um CEP válido');
      return false;
    }
    
    setLoadingShipping(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('calculate-shipping', {
        body: {
          from_postal_code: ORIGIN_CEP,
          to_postal_code: address.cep,
          products: cartItems.map(item => ({
            width: 20,
            height: 5,
            length: 30,
            weight: 0.3,
            quantity: item.quantity,
          })),
        },
      });
      
      if (error) throw error;
      
      if (data.options && data.options.length > 0) {
        setShippingOptions(data.options);
        setSelectedShipping(data.options[0]);
        // Agora avança para o próximo passo
        setStep(2);
        return true;
      } else {
        toast.error('Nenhuma opção de frete encontrada para este CEP');
        return false;
      }
    } catch (error: any) {
      console.error('Shipping calculation error:', error);
      toast.error('Erro ao calcular frete. Tente novamente.');
      return false;
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!address.cep || !address.street || !address.number || !address.neighborhood || !address.city || !address.state) {
        toast.error('Por favor, preencha todos os campos obrigatórios');
        return;
      }
      // calculateShipping já cuida de avançar para o próximo step
      await calculateShipping();
    } else if (step === 2) {
      if (!selectedShipping) {
        toast.error('Por favor, selecione uma opção de frete');
        return;
      }
      setStep(3);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedShipping) {
      toast.error('Selecione uma opção de frete');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const orderTotal = cartTotal + selectedShipping.price;
      
      // Create order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          subtotal: cartTotal,
          shipping_cost: selectedShipping.price,
          total: orderTotal,
          shipping_address: address as any,
          shipping_service: selectedShipping as any,
          status: 'pending',
          payment_status: 'pending',
        } as any)
        .select()
        .single();
      
      if (orderError) {
        console.error('Order creation error:', orderError);
        toast.error(`Erro ao criar pedido: ${orderError.message}`);
        setIsLoading(false);
        return;
      }
      
      if (!order) {
        toast.error('Pedido não foi criado');
        setIsLoading(false);
        return;
      }

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_image: item.product.images?.[0] || null,
        price: item.product.price,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) {
        console.error('Order items error:', itemsError);
        toast.error(`Erro ao adicionar itens ao pedido: ${itemsError.message}`);
        setIsLoading(false);
        return;
      }

      // Clear cart and redirect to order page
      await clearCart.mutateAsync();
      toast.success('Pedido criado com sucesso!');
      navigate(`/pedido/${order.id}`);
      
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.message || 'Erro ao criar pedido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-primary">Carregando...</div>
        </div>
      </div>
    );
  }

  const total = cartTotal + (selectedShipping?.price || 0);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-secondary/20">
      <div className="container max-w-4xl px-4">
        <h1 className="text-3xl md:text-4xl font-serif mb-8 text-center">Checkout</h1>
        
        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8">
          {[
            { num: 1, icon: MapPin, label: 'Endereço' },
            { num: 2, icon: Package, label: 'Frete' },
            { num: 3, icon: CreditCard, label: 'Pagamento' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s.num ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className={`ml-2 hidden sm:inline ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < 2 && <ChevronRight className="mx-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Endereço de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor="cep">CEP *</Label>
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={address.cep}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setAddress(prev => ({ ...prev, cep: value }));
                          if (value.length === 8) fetchAddressByCep(value);
                        }}
                        maxLength={9}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="street">Rua *</Label>
                    <Input
                      id="street"
                      placeholder="Nome da rua"
                      value={address.street}
                      onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        placeholder="123"
                        value={address.number}
                        onChange={(e) => setAddress(prev => ({ ...prev, number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto, bloco..."
                        value={address.complement}
                        onChange={(e) => setAddress(prev => ({ ...prev, complement: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Bairro"
                      value={address.neighborhood}
                      onChange={(e) => setAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        placeholder="Cidade"
                        value={address.city}
                        onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        placeholder="UF"
                        value={address.state}
                        onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Opções de Frete</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingShipping && (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-primary">Calculando frete...</span>
                    </div>
                  )}
                  
                  {!loadingShipping && shippingOptions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Nenhuma opção de frete disponível</p>
                      <Button onClick={calculateShipping}>Tentar novamente</Button>
                    </div>
                  )}
                  
                  {!loadingShipping && shippingOptions.length > 0 && (
                    <div className="space-y-3">
                      {shippingOptions.map((option) => (
                        <div
                          key={option.id}
                          className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedShipping?.id === option.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedShipping(option)}
                        >
                          <input
                            type="radio"
                            name="shipping"
                            value={option.id}
                            checked={selectedShipping?.id === option.id}
                            onChange={() => setSelectedShipping(option)}
                            className="cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{option.company} - {option.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Entrega em {option.delivery_range?.min || option.delivery_time} - {option.delivery_range?.max || option.delivery_time} dias úteis
                            </p>
                          </div>
                          <p className="font-semibold text-primary whitespace-nowrap ml-2">{formatPrice(option.price)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 bg-secondary/30 rounded-lg">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="font-medium mb-2">Pague com Mercado Pago</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Você será redirecionado para o Mercado Pago para concluir o pagamento de forma segura.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cartão de crédito, débito, Pix e boleto disponíveis
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Navigation buttons */}
            <div className="flex gap-4 mt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
              
              <div className="flex-1" />
              
              {step < 3 && (
                <Button onClick={handleNextStep} disabled={loadingShipping}>
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {step === 3 && (
                <Button onClick={handleCreateOrder} disabled={isLoading} className="bg-[#009ee3] hover:bg-[#007eb5]">
                  Pagar com Mercado Pago
                </Button>
              )}
            </div>
          </div>
          
          {/* Order summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-serif">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.product.images?.[0] ? (
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      <p className="text-sm font-semibold">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  {selectedShipping && (
                    <div className="flex justify-between text-sm">
                      <span>Frete</span>
                      <span>{formatPrice(selectedShipping.price)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;