import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Plus, Minus, Trash2, Loader2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';

interface CartSheetProps {
  children?: React.ReactNode;
}

const CartSheet = ({ children }: CartSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, isLoading, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">Seu Carrinho</SheetTitle>
        </SheetHeader>
        
        {!user ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Faça login para ver seu carrinho</p>
            <Button onClick={() => navigate('/auth')}>Entrar</Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cartItems.map((item) => {
                const variants = Array.isArray(item.product.product_variants)
                  ? item.product.product_variants
                  : [];
                const hasVariants = variants.length > 0;
                const variantMatch = hasVariants
                  ? variants.find(
                      (v) =>
                        (v.size ?? null) === (item.size ?? null) &&
                        (v.color ?? null) === (item.color ?? null)
                    )
                  : null;
                const variantMissing = hasVariants && !variantMatch;

                const availableStock = hasVariants
                  ? typeof variantMatch?.stock === 'number'
                    ? variantMatch.stock
                    : 0
                  : typeof item.product.stock === 'number'
                  ? item.product.stock
                  : null;

                const outOfStock = availableStock !== null && availableStock <= 0;
                const atLimit =
                  availableStock !== null && availableStock > 0 && item.quantity >= availableStock;

                return (
                  <div key={item.id} className="flex gap-4 p-4 bg-secondary/30 rounded-lg">
                    <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.product.images?.[0] ? (
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.product.name}</h4>
                      {(item.size || item.color) && (
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Tam: ${item.size}`}
                          {item.size && item.color && ' | '}
                          {item.color && `Cor: ${item.color}`}
                        </p>
                      )}
                      <p className="text-primary font-semibold">{formatPrice(item.product.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                          disabled={outOfStock || atLimit}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 ml-auto text-destructive"
                          onClick={() => removeFromCart.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {availableStock !== null && (
                        <p
                          className={`text-xs mt-1 ${
                            variantMissing || outOfStock
                              ? 'text-red-600'
                              : atLimit
                              ? 'text-amber-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {variantMissing
                            ? 'Combinação de variação não encontrada. Ajuste ou remova.'
                            : outOfStock
                            ? 'Esgotado no momento. Remova ou ajuste a quantidade.'
                            : atLimit
                            ? `Limite de estoque: ${availableStock} unidade(s).`
                            : `Em estoque: ${availableStock} unidade(s).`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleCheckout}>
                Finalizar Compra
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
