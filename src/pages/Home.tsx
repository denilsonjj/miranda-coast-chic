import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Waves, Heart, Sparkles, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import heroImage from "@/assets/hero-beach.jpg";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  // Fetch active announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch featured products (newest active products)
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const categories = [
    { name: "Vestidos", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80" },
    { name: "Conjuntos", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80" },
    { name: "Blusas", image: "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=800&q=80" },
    { name: "Calças", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80" },
  ];

  const values = [
    {
      icon: Waves,
      title: "Inspiração Costeira",
      description: "Peças que refletem a leveza e liberdade do litoral",
    },
    {
      icon: Heart,
      title: "Conforto & Qualidade",
      description: "Tecidos selecionados para o seu dia a dia",
    },
    {
      icon: Sparkles,
      title: "Estilo Versátil",
      description: "Do casual ao sofisticado, para todos os momentos",
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleAddToCart = (productId: string) => {
    if (!user) {
      toast.error('Faça login para adicionar ao carrinho');
      navigate('/auth');
      return;
    }
    addToCart.mutate({ productId });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/20 to-background/90" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-serif mb-6 text-white animate-fade-in">
            Descubra seu estilo
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Moda feminina delicada e moderna, inspirada pela beleza do litoral
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
              <Link to="/novidades">Ver Novidades</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white/10">
              <Link to="/loja">Explorar Loja</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Announcements Carousel */}
      {announcements.length > 0 && (
        <section className="py-6 bg-primary/5">
          <div className="container mx-auto px-4">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {announcements.map((announcement: any) => (
                  <CarouselItem key={announcement.id} className="md:basis-1/2 lg:basis-1/3">
                    {announcement.link_url ? (
                      <Link to={announcement.link_url} className="block">
                        <Card className="border-none shadow-medium hover:shadow-large transition-smooth overflow-hidden">
                          {announcement.image_url && (
                            <div className="aspect-[16/9] overflow-hidden">
                              <img
                                src={announcement.image_url}
                                alt={announcement.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardContent className={`${announcement.image_url ? 'p-4' : 'p-6'}`}>
                            <h3 className="font-serif text-lg font-medium">{announcement.title}</h3>
                            {announcement.description && (
                              <p className="text-sm text-muted-foreground mt-1">{announcement.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ) : (
                      <Card className="border-none shadow-medium overflow-hidden">
                        {announcement.image_url && (
                          <div className="aspect-[16/9] overflow-hidden">
                            <img
                              src={announcement.image_url}
                              alt={announcement.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardContent className={`${announcement.image_url ? 'p-4' : 'p-6'}`}>
                          <h3 className="font-serif text-lg font-medium">{announcement.title}</h3>
                          {announcement.description && (
                            <p className="text-sm text-muted-foreground mt-1">{announcement.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl md:text-4xl font-serif">Novidades</h2>
            <Button variant="outline" asChild>
              <Link to="/loja">Ver Todos</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product: any) => (
              <Card 
                key={product.id} 
                className="group overflow-hidden border-none shadow-medium hover:shadow-large transition-smooth"
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
                    <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                      {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                    </span>
                  )}
                </div>
                <CardContent className="p-3 md:p-4">
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <h3 className="font-medium text-sm md:text-base mb-2 line-clamp-1">{product.name}</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-base md:text-lg font-semibold text-primary">{formatPrice(product.price)}</span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.original_price)}
                      </span>
                    )}
                  </div>
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => handleAddToCart(product.id)}
                    disabled={addToCart.isPending || product.stock === 0}
                  >
                    {product.stock === 0 ? 'Esgotado' : 'Adicionar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl md:text-5xl font-serif text-center mb-12">Categorias</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              to="/loja"
              className="group relative overflow-hidden rounded-lg shadow-medium hover:shadow-large transition-smooth"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-smooth"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end">
                <h3 className="text-2xl font-serif text-white p-6">{category.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-serif text-center mb-12">Nossa Essência</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => (
              <Card key={value.title} className="border-none shadow-medium">
                <CardContent className="p-8 text-center">
                  <value.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-serif mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-serif mb-6">Pronta para descobrir?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Explore nossa coleção e encontre peças únicas que traduzem seu estilo
        </p>
        <Button size="lg" asChild>
          <Link to="/novidades">Conferir Novidades</Link>
        </Button>
      </section>
    </div>
  );
};

export default Home;
