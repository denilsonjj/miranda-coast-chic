import { Card, CardContent } from "@/components/ui/card";
import { Heart, Sparkles, Users } from "lucide-react";

const Sobre = () => {
  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1
            className="notranslate text-4xl md:text-6xl font-serif mb-6"
            data-no-translate
            translate="no"
          >
            Sobre a Miranda Coast
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Uma marca que nasceu do amor pela moda feminina e pela liberdade que o litoral
            representa
          </p>
        </div>

        {/* Story Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="gradient-sand rounded-lg p-8 md:p-12 shadow-medium">
            <h2 className="text-3xl font-serif mb-6 text-center">Nossa História</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
              A <span className="notranslate" data-no-translate translate="no">Miranda Coast</span> é a expressão da mulher que entende o seu poder.
Inspirada pela atitude, poder e o glamour que transcende o tempo, nossa marca traz um visual marcante, que valoriza a silhueta e garante uma presença inesquecível, seja qual for a estação. Peças atemporais com um toque de ousadia.
              </p>
              <p>
                Cada peça é cuidadosamente selecionada para oferecer conforto, versatilidade e
                personalidade. Acreditamos que a moda é uma forma de expressão pessoal, e por
                isso criamos roupas que se adaptam ao seu estilo de vida, do casual ao
                sofisticado.
              </p>
              <p>
                Nossa missão é vestir mulheres modernas que valorizam a qualidade, a beleza e a
                simplicidade. Peças que podem ser usadas em diversos momentos, sempre com
                elegância e autenticidade.
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-serif text-center mb-12">Nossos Valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-none shadow-medium">
              <CardContent className="p-8 text-center">
                <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-serif mb-3">Conforto & Qualidade</h3>
                <p className="text-muted-foreground">
                  Selecionamos os melhores tecidos e acabamentos para garantir peças duráveis e
                  confortáveis
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-medium">
              <CardContent className="p-8 text-center">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-serif mb-3">Versatilidade</h3>
                <p className="text-muted-foreground">
                  Peças que transitam entre diferentes ocasiões, adaptando-se ao seu estilo
                  único
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-medium">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-serif mb-3">Personalidade</h3>
                <p className="text-muted-foreground">
                  Valorizamos a individualidade e criamos peças que expressam sua essência
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-3xl mx-auto text-center bg-primary/5 rounded-lg p-12">
          <h2 className="text-3xl font-serif mb-6">Nossa Missão</h2>
          <p className="text-lg text-muted-foreground">
            Oferecer moda feminina delicada, moderna e versátil, que celebra a beleza, o
            conforto e a expressão pessoal de cada mulher, inspirando-se na liberdade e leveza
            do estilo de vida costeiro.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sobre;
