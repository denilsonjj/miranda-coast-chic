import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "./pages/Home";
import Novidades from "./pages/Novidades";
import Loja from "./pages/Loja";
import Produto from "./pages/Produto";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import Rastreamento from "./pages/Rastreamento";
import PoliticaTroca from "./pages/PoliticaTroca";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import Pedido from "./pages/Pedido";
import MeusPedidos from "./pages/MeusPedidos";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/novidades" element={<Novidades />} />
                  <Route path="/loja" element={<Loja />} />
                  <Route path="/produto/:id" element={<Produto />} />
                  <Route path="/sobre" element={<Sobre />} />
                  <Route path="/contato" element={<Contato />} />
                  <Route path="/rastreamento" element={<Rastreamento />} />
                  <Route path="/politica-troca" element={<PoliticaTroca />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/pedido/:id" element={<Pedido />} />
                  <Route path="/meus-pedidos" element={<MeusPedidos />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;