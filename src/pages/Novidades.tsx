import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Novidades = () => {
  const products = [
    {
      id: 1,
      name: "Vestido Linho Azul",
      price: "R$ 289,90",
      image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
      badge: "Novo",
    },
    {
      id: 2,
      name: "Conjunto Cropped e Saia",
      price: "R$ 239,90",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
      badge: "Novo",
    },
    {
      id: 3,
      name: "Blusa Manga Bufante",
      price: "R$ 159,90",
      image: "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=800&q=80",
      badge: "Destaque",
    },
    {
      id: 4,
      name: "Calça Wide Leg",
      price: "R$ 219,90",
      image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80",
      badge: "Novo",
    },
    {
      id: 5,
      name: "Body Decote Quadrado",
      price: "R$ 129,90",
      image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
      badge: "Novo",
    },
    {
      id: 6,
      name: "Vestido Midi Floral",
      price: "R$ 319,90",
      image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80",
      badge: "Destaque",
    },
  ];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group overflow-hidden border-none shadow-medium hover:shadow-large transition-smooth"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-smooth"
                />
                <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-sm rounded-full">
                  {product.badge}
                </span>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-serif mb-2">{product.name}</h3>
                <p className="text-lg font-medium text-primary mb-4">{product.price}</p>
                <Button className="w-full">Ver Detalhes</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Novidades;
