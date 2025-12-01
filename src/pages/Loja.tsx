import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Loja = () => {
  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif mb-4">Nossa Loja</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Explore todas as categorias e encontre a peça perfeita para o seu estilo
          </p>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {["Vestidos", "Conjuntos", "Blusas", "Croppeds", "Bodys", "Calças", "Saias"].map(
            (category) => (
              <Card
                key={category}
                className="group overflow-hidden border-none shadow-medium hover:shadow-large transition-smooth cursor-pointer"
              >
                <div className="gradient-ocean h-48 flex items-center justify-center">
                  <h3 className="text-3xl font-serif text-white">{category}</h3>
                </div>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center mb-4">
                    Em breve disponível
                  </p>
                  <Button className="w-full" variant="outline" disabled>
                    Ver Coleção
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Coming Soon Message */}
        <div className="mt-16 text-center bg-secondary/30 rounded-lg p-12">
          <h2 className="text-3xl font-serif mb-4">Loja Online em Breve</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Estamos preparando uma experiência de compra incrível para você. Nossa loja online
            estará disponível em breve com toda a nossa coleção!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Loja;
