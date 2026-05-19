import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PASSWORD_RULES = [
  "mínimo de 8 caracteres",
  "pelo menos 1 letra",
  "pelo menos 1 número",
  "pelo menos 1 símbolo",
];

const PASSWORD_HELP_TEXT = "Mínimo de 8 caracteres, incluindo número e símbolo.";

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const cleanPhone = (phone: string) => phone.replace(/\D/g, "").slice(0, 13);

const getFriendlyAuthError = (message: string) => {
  if (message === "Invalid login credentials") return "Email ou senha incorretos";
  if (message.includes("already registered")) return "Este email já está cadastrado";
  if (message.includes("Password should be at least")) {
    return "A senha precisa seguir as regras abaixo.";
  }
  return message;
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    session,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    loading: authLoading,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isRecoveryLink = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    return (
      params.get("recovery") === "1" ||
      params.get("type") === "recovery" ||
      hashParams.get("type") === "recovery"
    );
  }, [location.hash, location.search]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  useEffect(() => {
    if (user && !isRecoveryLink) {
      navigate("/");
    }
  }, [user, isRecoveryLink, navigate]);

  const validatePassword = (password: string) => {
    if (isStrongPassword(password)) return true;
    toast.error("Senha fraca", {
      description: `Use ${PASSWORD_RULES.join(", ")}.`,
    });
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail.trim(), loginPassword);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
    } else {
      toast.success("Login realizado com sucesso!");
      navigate("/");
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!validatePassword(signupPassword)) return;

    const phone = cleanPhone(signupPhone);
    if (phone.length < 10) {
      toast.error("Informe um telefone/WhatsApp válido.");
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(signupEmail.trim(), signupPassword, signupName.trim(), phone);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
    } else {
      toast.success("Conta criada com sucesso! Verifique seu email se a confirmação estiver ativa.");
      navigate("/");
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetEmail.trim() || loginEmail.trim();

    if (!email) {
      toast.error("Informe seu email para receber o link de recuperação.");
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
      return;
    }

    toast.success("Enviamos um link para redefinir sua senha.");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== newPasswordConfirm) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!validatePassword(newPassword)) return;

    const { data: { session: activeSession } } = await supabase.auth.getSession();
    if (!session && !activeSession) {
      toast.error("Link de recuperação inválido ou expirado. Solicite um novo link.");
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
      return;
    }

    toast.success("Senha atualizada com sucesso!");
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isRecoveryLink) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="container max-w-md px-4">
          <Card className="shadow-large border-none">
            <CardHeader className="text-center">
              <CardTitle className="notranslate text-3xl font-serif" data-no-translate translate="no">
                Miranda Coast
              </CardTitle>
              <CardDescription>Crie uma nova senha para acessar sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Exemplo: Miranda@2026"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password-confirm">Confirmar nova senha</Label>
                  <Input
                    id="new-password-confirm"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {PASSWORD_HELP_TEXT}
                </p>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Atualizar senha
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
      <div className="container max-w-md px-4">
        <Card className="shadow-large border-none">
          <CardHeader className="text-center">
            <CardTitle className="notranslate text-3xl font-serif" data-no-translate translate="no">
              Miranda Coast
            </CardTitle>
            <CardDescription>Entre ou crie sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
                <TabsTrigger value="reset">Senha</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone/WhatsApp</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(47) 99999-9999"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(cleanPhone(e.target.value))}
                      autoComplete="tel"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Exemplo: Miranda@2026"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {PASSWORD_HELP_TEXT}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar senha</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Repita a senha"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email cadastrado</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você receberá um link para criar uma nova senha.
                  </p>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enviar link
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
