import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Package, Clock, AlertCircle } from "lucide-react";

const PoliticaTroca = () => {
  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <RefreshCw className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl md:text-6xl font-serif mb-4">Política de Troca e Devolução</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sua satisfação é nossa prioridade. Conheça nossa política
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Policy */}
          <Card className="shadow-medium border-none">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif mb-4">Prazo para Troca ou Devolução</h2>
              <p className="text-muted-foreground mb-4">
                Você tem até <strong>30 dias corridos</strong> após o recebimento do produto para
                solicitar troca ou devolução.
              </p>
              <p className="text-muted-foreground">
                Para produtos com defeito de fabricação, o prazo é de até <strong>90 dias</strong>{" "}
                conforme o Código de Defesa do Consumidor.
              </p>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card className="shadow-medium border-none">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif mb-4">Condições para Troca ou Devolução</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Produto sem sinais de uso, lavagem ou alterações
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Etiquetas originais preservadas
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Embalagem original em bom estado
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Nota fiscal ou comprovante de compra
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* How to Request */}
          <Card className="shadow-medium border-none">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif mb-4">Como Solicitar</h2>
              <ol className="space-y-4 text-muted-foreground">
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">1.</span>
                  <div>
                    <strong>Entre em contato</strong>
                    <p className="text-sm mt-1">
                      Envie um e-mail para contato@mirandacosta.com com seu número de pedido e o
                      motivo da troca/devolução
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">2.</span>
                  <div>
                    <strong>Aguarde autorização</strong>
                    <p className="text-sm mt-1">
                      Nossa equipe analisará sua solicitação e enviará instruções em até 2 dias
                      úteis
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">3.</span>
                  <div>
                    <strong>Envie o produto</strong>
                    <p className="text-sm mt-1">
                      Embale adequadamente e envie pelos Correios conforme instruções recebidas
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">4.</span>
                  <div>
                    <strong>Receba sua troca ou reembolso</strong>
                    <p className="text-sm mt-1">
                      Após recebermos e aprovarmos o produto, processaremos a troca ou o reembolso
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Important Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-medium border-none">
              <CardContent className="p-6 text-center">
                <Package className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-serif text-lg mb-2">Frete de Troca</h3>
                <p className="text-sm text-muted-foreground">
                  Por conta do cliente, exceto em casos de defeito ou erro de envio
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-none">
              <CardContent className="p-6 text-center">
                <Clock className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-serif text-lg mb-2">Prazo de Análise</h3>
                <p className="text-sm text-muted-foreground">
                  Até 5 dias úteis após recebermos o produto de volta
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-none">
              <CardContent className="p-6 text-center">
                <RefreshCw className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-serif text-lg mb-2">Reembolso</h3>
                <p className="text-sm text-muted-foreground">
                  Até 10 dias úteis após aprovação da devolução
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Important Note */}
          <Card className="shadow-medium border-none bg-accent/20">
            <CardContent className="p-8">
              <div className="flex items-start space-x-4">
                <AlertCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-serif mb-2">Importante</h3>
                  <p className="text-muted-foreground">
                    Produtos em promoção seguem as mesmas regras de troca e devolução. Lingeries,
                    bodys e biquínis só podem ser trocados caso apresentem defeito de fabricação,
                    conforme legislação sanitária vigente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PoliticaTroca;
