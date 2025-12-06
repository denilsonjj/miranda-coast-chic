import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag } from 'lucide-react';

const Novidades = () => {
  const navigate = useNavigate();

  // Buscar os 6 produtos mais recentes
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['novidades-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data || [];
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getProductBadge = (product: any, index: number) => {
    if (product.original_price && product.original_price > product.price) {
      return { text: 'Destaque', variant: 'destructive' };
    }
    // Primeiros 3 produtos são "Novo"
    if (index < 3) {
      return { text: 'Novo', variant: 'default' };
    }
    return { text: 'Destaque', variant: 'secondary' };
  };

  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif mb-4">Novidades</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra as últimas peças da nossa coleção, cuidadosamente selecionadas para você
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-secondary/30 rounded-lg">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-serif mb-2">Nenhum produto encontrado</h2>
            <p className="text-muted-foreground mb-4">Em breve teremos novidades!</p>
            <Button onClick={() => navigate('/loja')}>Ver todos os produtos</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product: any, index: number) => {
              const badge = getProductBadge(product, index);
              const hasDiscount = product.original_price && product.original_price > product.price;
              
              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden border-none shadow-medium hover:shadow-large transition-smooth cursor-pointer"
                  onClick={() => navigate(`/produto/${product.id}`)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-smooth"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center gradient-ocean">
                        <ShoppingBag className="h-12 w-12 text-primary-foreground/50" />
                      </div>
                    )}
                    <Badge 
                      className="absolute top-4 left-4"
                      variant={badge.variant as any}
                    >
                      {badge.text}
                    </Badge>
                    {hasDiscount && (
                      <span className="absolute top-4 right-4 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                    <h3 className="text-xl font-serif mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      <p className="text-lg font-semibold text-primary">{formatPrice(product.price)}</p>
                      {hasDiscount && (
                        <p className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.original_price)}
                        </p>
                      )}
                    </div>
                    <Button 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/produto/${product.id}`);
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Novidades;
