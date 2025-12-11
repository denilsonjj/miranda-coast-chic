import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Instagram, Clock } from "lucide-react";

const Contato = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif mb-4">Contato</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Estamos aqui para ajudar! Entre em contato conosco
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="shadow-medium border-none">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif mb-6">Envie sua mensagem</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Seu nome completo" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" type="tel" placeholder="(00) 00000-0000" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input id="subject" placeholder="Como podemos ajudar?" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Conte-nos mais sobre sua dúvida ou sugestão"
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Enviar Mensagem
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card className="shadow-medium border-none">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <Mail className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="text-xl font-serif mb-2">E-mail</h3>
                    <p className="text-muted-foreground" translate="no">mirandacoastr@gmail.com</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Respondemos em até 24 horas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-none">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <Instagram className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="text-xl font-serif mb-2">Instagram</h3>
                    <p className="text-muted-foreground" translate="no">@miranda_coast</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Siga-nos para novidades e promoções
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-none">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <Clock className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="text-xl font-serif mb-2">Horário de Atendimento</h3>
                    <p className="text-muted-foreground">Segunda a Sexta: 9h às 18h</p>
                    <p className="text-muted-foreground">Sábado: 9h às 13h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="gradient-ocean rounded-lg p-8 text-white">
              <h3 className="text-2xl font-serif mb-3">Atendimento Personalizado</h3>
              <p className="text-white/90">
                Nossa equipe está pronta para ajudá-la a encontrar a peça perfeita ou esclarecer
                qualquer dúvida sobre nossos produtos e serviços.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contato;
