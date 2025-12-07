import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag } from "lucide-react";

const Novidades = () => {
  const navigate = useNavigate();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["latest-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif mb-4">Novidades</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra as ?ltimas pe?as da nossa cole??o, cuidadosamente selecionadas para voc?
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-secondary/30 rounded-lg">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-serif mb-2">Nada por aqui ainda</h2>
            <p className="text-muted-foreground">Assim que novos produtos forem cadastrados, eles aparecem aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product: any) => (
              <Card
                key={product.id}
                className="group overflow-hidden border-none shadow-medium hover:shadow-large transition-smooth cursor-pointer"
                onClick={() => navigate(`/produto/${product.id}`)}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-smooth"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-sm rounded-full">
                    Novo
                  </span>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-serif mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-medium text-primary mb-4">{formatPrice(product.price)}</p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Novidades;
