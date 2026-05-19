import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RouteSEO from "@/components/RouteSEO";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Home = lazy(() => import("./pages/Home"));
const Novidades = lazy(() => import("./pages/Novidades"));
const Loja = lazy(() => import("./pages/Loja"));
const Produto = lazy(() => import("./pages/Produto"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Contato = lazy(() => import("./pages/Contato"));
const Rastreamento = lazy(() => import("./pages/Rastreamento"));
const PoliticaTroca = lazy(() => import("./pages/PoliticaTroca"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const PoliticaCookies = lazy(() => import("./pages/PoliticaCookies"));
const Auth = lazy(() => import("./pages/Auth"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Pedido = lazy(() => import("./pages/Pedido"));
const MeusPedidos = lazy(() => import("./pages/MeusPedidos"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CookieConsent = lazy(() => import("./components/CookieConsent"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

const SupabaseAuthRedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const code = searchParams.get("code");

    const error = searchParams.get("error") || hashParams.get("error");
    const errorCode = searchParams.get("error_code") || hashParams.get("error_code");
    const description = searchParams.get("error_description") || hashParams.get("error_description");
    const type = searchParams.get("type") || hashParams.get("type");
    const isRecovery =
      searchParams.get("recovery") === "1" ||
      type === "recovery" ||
      hashParams.get("type") === "recovery";

    if (error || errorCode) {
      const expired = errorCode === "otp_expired" || description?.toLowerCase().includes("expired");
      const message = expired
        ? "Esse link de email expirou. Entre novamente ou solicite um novo link."
        : "Nao foi possivel confirmar esse link. Tente entrar novamente.";

      window.history.replaceState(null, "", "/auth");
      toast.error(message);
      navigate("/auth", { replace: true });
      return;
    }

    if (isRecovery && code) {
      let cancelled = false;

      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (cancelled) return;

        if (session) {
          window.history.replaceState(null, "", "/auth?recovery=1");
          navigate("/auth?recovery=1", { replace: true });
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;

        if (error) {
          toast.error("Esse link de recuperação expirou ou já foi usado. Solicite um novo link.");
          navigate("/auth", { replace: true });
          return;
        }

        window.history.replaceState(null, "", "/auth?recovery=1");
        navigate("/auth?recovery=1", { replace: true });
      });

      return () => {
        cancelled = true;
      };
    }

    if (isRecovery && (location.pathname !== "/auth" || location.hash || searchParams.get("recovery") !== "1")) {
      window.history.replaceState(null, "", "/auth?recovery=1");
      navigate("/auth?recovery=1", { replace: true });
      return;
    }

    if (type && type !== "recovery") {
      window.history.replaceState(null, "", "/");
      toast.success("Email confirmado com sucesso.");
      navigate("/", { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SupabaseAuthRedirectHandler />
          <RouteSEO />
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/novidades" element={<Novidades />} />
                    <Route path="/loja" element={<Loja />} />
                    <Route path="/produto/:id" element={<Produto />} />
                    <Route path="/sobre" element={<Sobre />} />
                    <Route path="/contato" element={<Contato />} />
                    <Route path="/rastreamento" element={<Rastreamento />} />
                    <Route path="/politica-troca" element={<PoliticaTroca />} />
                    <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
                    <Route path="/politica-de-cookies" element={<PoliticaCookies />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/pedido/:id" element={<Pedido />} />
                    <Route path="/meus-pedidos" element={<MeusPedidos />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
          <Suspense fallback={null}>
            <CookieConsent />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
