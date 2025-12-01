import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Waves, Heart, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-beach.jpg";

const Home = () => {
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

      {/* Categories */}
      <section className="container mx-auto px-4 py-20">
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
