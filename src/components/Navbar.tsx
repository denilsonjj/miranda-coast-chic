import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Shield, Waves, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import CartSheet from "./CartSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Novidades", path: "/novidades" },
    { name: "Loja", path: "/loja" },
    { name: "Sobre", path: "/sobre" },
    { name: "Contato", path: "/contato" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    navigate(`/loja?q=${encodeURIComponent(term)}`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm shadow-soft">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button - Left */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>

          {/* Logo - Centered on mobile */}
         <Link
  to="/"
  className="notranslate flex items-center gap-2 md:flex-none absolute left-1/2 transform -translate-x-1/2 md:static md:transform-none"
  data-no-translate
  translate="no"
  aria-label="Miranda Coast"
>
  <Waves className="h-7 w-7 text-primary" />
  <span
    className="notranslate text-xl md:text-3xl font-serif font-light tracking-wide text-primary whitespace-nowrap"
    data-no-translate
    translate="no"
  >
    Miranda Coast
  </span>
</Link>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm font-medium text-foreground hover:text-primary transition-smooth"
              >
                {link.name}
              </Link>
            ))}

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produtos"
                  className="pl-10"
                />
              </div>
            </form>

            <CartSheet />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/meus-pedidos')}>
                    Meus Pedidos
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Painel Admin
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Entrar
              </Button>
            )}
          </div>

          {/* Cart - Right on mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <CartSheet />
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-border pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block text-sm font-medium text-foreground hover:text-primary transition-smooth"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/meus-pedidos"
                  className="block text-sm font-medium text-foreground hover:text-primary transition-smooth"
                  onClick={() => setIsOpen(false)}
                >
                  Meus Pedidos
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block text-sm font-medium text-primary hover:text-primary/80 transition-smooth"
                    onClick={() => setIsOpen(false)}
                  >
                    Painel Admin
                  </Link>
                )}
                <button
                  onClick={() => { handleSignOut(); setIsOpen(false); }}
                  className="block text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="block text-sm font-medium text-primary"
                onClick={() => setIsOpen(false)}
              >
                Entrar
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
