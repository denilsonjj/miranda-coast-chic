import { Link } from "react-router-dom";
import { Instagram, Facebook, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3
              className="notranslate text-2xl font-serif text-primary"
              data-no-translate
              translate="no"
            >
              Miranda Coast
            </h3>
            <p className="text-sm text-muted-foreground">
              Moda feminina delicada, moderna e elegante, inspirada pela liberdade do litoral.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium mb-4">Navegação</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/novidades" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Novidades
                </Link>
              </li>
              <li>
                <Link to="/loja" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Loja
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Sobre
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-medium mb-4">Atendimento</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/rastreamento" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Rastreie seu pedido
                </Link>
              </li>
              <li>
                <Link to="/politica-troca" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Trocas e devoluções
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-medium mb-4">Redes Sociais</h4>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/miranda_coast/"
                className="text-muted-foreground hover:text-primary transition-smooth"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-smooth"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="mailto:contato@mirandacosta.com"
                className="text-muted-foreground hover:text-primary transition-smooth"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Miranda Costa. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
