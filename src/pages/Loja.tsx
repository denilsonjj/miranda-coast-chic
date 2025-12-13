import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { Loader2, ShoppingBag, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';

const defaultCategories = ["Todos", "Vestidos", "Conjuntos", "Blusas", "Croppeds", "Bodys", "Calcas", "Saias"];

const Loja = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || "Todos");
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
    setSelectedCategory(searchParams.get('category') || "Todos");
  }, [searchParams]);

  const categoryOptions = ['Todos', ...(categoriesData.length ? categoriesData.map((cat: any) => cat.name) : defaultCategories.filter(c => c !== 'Todos'))];

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', selectedCategory, (searchTerm || '').trim()],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (selectedCategory !== "Todos") {
        query = query.eq('category', selectedCategory);
      }

      const searchFilter = (searchTerm || '').trim();
      if (searchFilter) {
        query = query.or(`name.ilike.%${searchFilter}%,description.ilike.%${searchFilter}%,category.ilike.%${searchFilter}%`);
      }
      
      const { data, error } = await query;
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

  const requiresSelection = (product: any) => {
    return (product?.sizes && product.sizes.length > 0) || (product?.colors && product.colors.length > 0);
  };

  const handleAddToCart = async (product: any) => {
    if (!user) {
      toast.error('Faça login para adicionar ao carrinho');
      navigate('/auth');
      return;
    }
    
    if (requiresSelection(product)) {
      toast.message('Selecione tamanho e cor para adicionar', {
        description: 'Abrindo detalhes do produto.',
      });
      navigate(`/produto/${product.id}`);
      return;
    }
    
    setIsAddingToCart(product.id);
    try {
      await addToCart.mutateAsync({ productId: product.id });
    } finally {
      setIsAddingToCart(null);
    }
  };

  const applyFiltersToParams = (category: string, term: string) => {
    const params: Record<string, string> = {};
    if (term.trim()) params.q = term.trim();
    if (category !== "Todos") params.category = category;
    setSearchParams(params);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    applyFiltersToParams(value, searchTerm);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFiltersToParams(selectedCategory, searchTerm);
  };

  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif mb-4">Nossa Loja</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore todas as categorias e encontre a peça perfeita para o seu estilo
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-[260px] items-center gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, descrição ou categoria"
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar por:</span>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-secondary/30 rounded-lg">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-serif mb-2">Nenhum produto encontrado</h2>
            <p className="text-muted-foreground mb-4">
              {selectedCategory !== "Todos" 
                ? `Não há produtos na categoria ${selectedCategory} no momento.`
                : "Em breve teremos novidades!"}
            </p>
            {selectedCategory !== "Todos" && (
              <Button variant="outline" onClick={() => setSelectedCategory("Todos")}>
                Ver todos os produtos
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <Card 
                key={product.id} 
                className="group overflow-hidden border-none shadow-medium hover:shadow-large transition-smooth cursor-pointer"
                onClick={() => navigate(`/produto/${product.id}`)}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center gradient-ocean">
                      <ShoppingBag className="h-12 w-12 text-primary-foreground/50" />
                    </div>
                  )}
                  {product.original_price && product.original_price > product.price && (
                    <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                      {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                    </span>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-lg font-semibold text-primary">{formatPrice(product.price)}</span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.original_price)}
                      </span>
                    )}
                  </div>
                  {typeof product.stock === 'number' && (
                    <p
                      className={`text-xs mb-3 ${
                        product.stock === 0
                          ? 'text-red-600'
                          : product.stock <= 5
                          ? 'text-amber-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {product.stock === 0
                        ? 'Esgotado no momento'
                        : product.stock <= 5
                        ? `Restam ${product.stock} unidade(s) em estoque`
                        : `Estoque: ${product.stock} unidade(s)`}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={isAddingToCart === product.id || product.stock === 0}
                      size="sm"
                    >
                      {isAddingToCart === product.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adicionando...
                        </>
                      ) : (
                        product.stock === 0 ? 'Esgotado' : 'Carrinho'
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/produto/${product.id}`);
                      }}
                      size="sm"
                      className="flex-1"
                    >
                      Detalhes
                    </Button>
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

export default Loja;
