import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Search } from "lucide-react";

const Rastreamento = () => {
  const [trackingCode, setTrackingCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle tracking
  };

  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Package className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl md:text-6xl font-serif mb-4">Rastreie seu Pedido</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Acompanhe o status da sua encomenda em tempo real
          </p>
        </div>

        {/* Tracking Form */}
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-medium border-none">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tracking">Código de Rastreamento</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tracking"
                      placeholder="Digite o código do seu pedido"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      required
                    />
                    <Button type="submit" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O código de rastreamento foi enviado para o seu e-mail
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card className="shadow-medium border-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-serif mb-2">Prazo de Entrega</h3>
                <p className="text-muted-foreground text-sm">
                  Os pedidos são processados em até 2 dias úteis e enviados pelos Correios. O
                  prazo de entrega varia conforme sua região.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-serif mb-2">Dúvidas sobre o Rastreamento?</h3>
                <p className="text-muted-foreground text-sm">
                  Entre em contato conosco pelo e-mail contato@mirandacosta.com ou pela nossa
                  página de contato.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="mt-12 bg-secondary/30 rounded-lg p-8">
            <h2 className="text-2xl font-serif mb-4">Como Rastrear?</h2>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <span className="font-medium text-primary mr-2">1.</span>
                Localize o código de rastreamento no e-mail de confirmação do pedido
              </li>
              <li className="flex items-start">
                <span className="font-medium text-primary mr-2">2.</span>
                Digite o código no campo acima
              </li>
              <li className="flex items-start">
                <span className="font-medium text-primary mr-2">3.</span>
                Acompanhe o status da sua entrega em tempo real
              </li>
              <li className="flex items-start">
                <span className="font-medium text-primary mr-2">4.</span>
                Em caso de dúvidas, entre em contato com nosso atendimento
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rastreamento;
