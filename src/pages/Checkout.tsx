import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Package, MapPin, CreditCard, Check, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface ShippingOption {
  id: string;
  name: string;
  company: string;
  price: number;
  delivery_time: number;
  delivery_range: { min: number; max: number };
  pickup?: boolean;
  address?: {
    name?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    phone?: string;
  };
}

interface Address {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  document: string;
}

type PaymentMethod = "pix" | "card" | "boleto";

const ORIGIN_CEP = import.meta.env.VITE_ORIGIN_CEP || "88348225";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const DEFAULT_WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co")}/payment-webhook`
  : "";
const MERCADO_PAGO_WEBHOOK =
  import.meta.env.VITE_MERCADO_PAGO_WEBHOOK_URL ||
  DEFAULT_WEBHOOK_URL ||
  `${window.location.origin}/api/webhook/mercado-pago`;
const MERCADO_PAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "";

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

const Checkout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, cartTotal, clearCart, isLoading: cartLoading } = useCart();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [address, setAddress] = useState<Address>({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    document: "",
  });

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [payerName, setPayerName] = useState(user?.user_metadata?.full_name || "");
  const [payerFirstName, setPayerFirstName] = useState("");
  const [payerLastName, setPayerLastName] = useState("");
  const [payerEmail, setPayerEmail] = useState(user?.email || "");
  const [payerDocument, setPayerDocument] = useState("");
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [cardFormError, setCardFormError] = useState("");
  const mpRef = useRef<any>(null);
  const cardFormRef = useRef<any>(null);
  const [mpScriptLoaded, setMpScriptLoaded] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const total = useMemo(() => cartTotal + (selectedShipping?.price || 0), [cartTotal, selectedShipping]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    const full = user?.user_metadata?.full_name || "";
    const parts = full.trim().split(" ");
    setPayerFirstName(parts.shift() || "");
    setPayerLastName(parts.join(" "));
    setPayerName(full);
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!cartLoading && cartItems.length === 0 && user && !orderId && !paymentResult) {
      navigate("/loja");
      toast.error("Seu carrinho está vazio");
    }
  }, [cartItems, cartLoading, user, navigate, orderId, paymentResult]);

  useEffect(() => {
    if (step === 3 && paymentMethod === "card" && MERCADO_PAGO_PUBLIC_KEY) {
      if (mpRef.current) return;
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.onload = () => setMpScriptLoaded(true);
      script.onerror = () => toast.error("Erro ao carregar o SDK do Mercado Pago");
      document.body.appendChild(script);
    }
  }, [step, paymentMethod]);

  useEffect(() => {
    if (!mpScriptLoaded || paymentMethod !== "card" || !MERCADO_PAGO_PUBLIC_KEY) return;
    if (!window.MercadoPago) return;
    if (cardFormRef.current) return;

    try {
      mpRef.current = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, { locale: "pt-BR" });

      const cardForm = mpRef.current.cardForm({
        amount: total.toFixed(2),
        autoMount: true,
        form: {
          id: "payment-form",
          cardholderName: { id: "form-cardholderName", placeholder: "Nome do titular" },
          cardholderEmail: { id: "form-cardholderEmail", placeholder: "Email do titular" },
          cardNumber: { id: "form-cardNumber", placeholder: "Número do cartão" },
          cardExpirationMonth: { id: "form-cardExpirationMonth", placeholder: "MM" },
          cardExpirationYear: { id: "form-cardExpirationYear", placeholder: "YY" },
          securityCode: { id: "form-securityCode", placeholder: "CVV" },
          installments: { id: "form-installments" },
          identificationType: { id: "form-identificationType" },
          identificationNumber: { id: "form-identificationNumber", placeholder: "CPF/CNPJ" },
          issuer: { id: "form-issuer" },
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) {
              console.warn("Card form mounted error", error);
              setCardFormError("Erro ao montar o formulário do cartão.");
            } else {
              setCardFormError("");
            }
          },
          onError: (error: any) => {
            console.warn("Card form error", error);
            setCardFormError("Verifique os dados do cartão.");
          },
          onSubmit: async (event: any) => {
            event.preventDefault();

            try {
              const cardData = cardForm.getCardFormData();
              if (!cardData.token) {
                setCardFormError("Não foi possível tokenizar o cartão. Confira os dados e tente novamente.");
                return;
              }

              await handleCreateOrder(cardData);
            } catch (err) {
              console.error("Erro no onSubmit do cartão", err);
              setCardFormError("Erro ao processar o pagamento com cartão.");
            }
          },
        },
      });

      cardFormRef.current = cardForm;
    } catch (e) {
      console.error("Erro ao iniciar MP", e);
      toast.error("Erro ao iniciar pagamento com cartão");
    }
  }, [mpScriptLoaded, paymentMethod, total]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setAddress((prev) => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  };

  const calculateShipping = async () => {
    if (!address.cep || address.cep.replace(/\D/g, "").length !== 8) {
      toast.error("Por favor, informe um CEP válido");
      return false;
    }

    setLoadingShipping(true);

    try {
      const { data, error } = await supabase.functions.invoke("calculate-shipping", {
        body: {
          from_postal_code: ORIGIN_CEP,
          to_postal_code: address.cep,
          products: cartItems.map((item) => ({
            width: 20,
            height: 5,
            length: 30,
            weight: 0.3,
            quantity: item.quantity,
          })),
        },
      });

      if (error) throw error;

      if (data.options && data.options.length > 0) {
        setShippingOptions(data.options);
        const firstPaid = data.options.find((opt: any) => !opt.pickup);
        setSelectedShipping(firstPaid || data.options[0]);
        setStep(2);
        return true;
      } else {
        toast.error("Nenhuma opção de frete encontrada para este CEP");
        return false;
      }
    } catch (error: any) {
      console.error("Shipping calculation error:", error);
      toast.error("Erro ao calcular frete. Tente novamente.");
      return false;
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const docClean = address.document.replace(/\D/g, "");
      if (
        !address.cep ||
        !address.street ||
        !address.number ||
        !address.neighborhood ||
        !address.city ||
        !address.state ||
        docClean.length < 11
      ) {
        toast.error("Por favor, preencha todos os campos obrigatórios (incluindo CPF/CNPJ válido)");
        return;
      }
      await calculateShipping();
    } else if (step === 2) {
      if (!selectedShipping) {
        toast.error("Por favor, selecione uma opção de frete");
        return;
      }
      setStep(3);
    }
  };

  const handleCreateOrder = async (cardDataFromMP?: any) => {
    if (!selectedShipping) {
      toast.error("Selecione uma opção de frete");
      return;
    }
    if (!payerFirstName || !payerLastName || !payerEmail || !payerDocument) {
      toast.error("Informe nome, sobrenome, e-mail e CPF/CNPJ para pagar");
      return;
    }
    if (paymentMethod === "card" && !MERCADO_PAGO_PUBLIC_KEY) {
      toast.error("Chave pública do Mercado Pago não configurada");
      return;
    }

    setIsLoading(true);
    setIsPaying(true);
    setPaymentResult(null);

    try {
      if (cartItems.length === 0) {
        toast.error("Seu carrinho está vazio");
        setIsLoading(false);
        setIsPaying(false);
        return;
      }

      const productIds = cartItems.map((item) => item.product_id);
      const { data: productsStock, error: stockError } = await supabase
        .from("products")
        .select("id, stock, name, is_active, product_variants (id, color, size, stock)")
        .in("id", productIds);

      if (stockError) {
        console.error("Stock check error:", stockError);
        toast.error("Não foi possível validar o estoque. Tente novamente.");
        setIsLoading(false);
        setIsPaying(false);
        return;
      }

      const stockMap = (productsStock || []).reduce((acc: Record<string, any>, product: any) => {
        acc[product.id] = {
          ...product,
          product_variants: Array.isArray(product.product_variants)
            ? product.product_variants.map((v: any) => ({ ...v }))
            : [],
        };
        return acc;
      }, {});

      for (const item of cartItems) {
        const productInfo = stockMap[item.product_id];
        const productName = productInfo?.name || item.product?.name || "Produto";
        const variants = Array.isArray(productInfo?.product_variants) ? productInfo.product_variants : [];
        const hasVariants = variants.length > 0;
        const variantMatch = hasVariants
          ? variants.find((v: any) => {
              const sizeMatch = v.size ? v.size === (item.size ?? null) : true;
              const colorMatch = v.color ? v.color === (item.color ?? null) : true;
              return sizeMatch && colorMatch;
            })
          : null;

        const available = hasVariants
          ? typeof variantMatch?.stock === "number"
            ? variantMatch.stock
            : 0
          : typeof productInfo?.stock === "number"
          ? productInfo.stock
          : 0;

        if (!productInfo || !productInfo.is_active) {
          toast.error(`O produto ${productName} está indisponível.`);
          setIsLoading(false);
          setIsPaying(false);
          return;
        }

        if (hasVariants && !variantMatch) {
          toast.error(`A combinação selecionada para ${productName} não foi encontrada. Refaça a seleção.`);
          setIsLoading(false);
          setIsPaying(false);
          return;
        }

        if (available <= 0) {
          toast.error(`O produto ${productName} está esgotado.`);
          setIsLoading(false);
          setIsPaying(false);
          return;
        }

        if (item.quantity > available) {
          toast.error(`Só temos ${available} unidade(s) de ${productName} em estoque. Ajuste o carrinho para continuar.`);
          setIsLoading(false);
          setIsPaying(false);
          return;
        }
      }

      const orderTotal = cartTotal + (selectedShipping?.price || 0);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          subtotal: cartTotal,
          shipping_cost: selectedShipping.price,
          total: orderTotal,
          shipping_address: {
            ...address,
            name: `${payerFirstName} ${payerLastName}`.trim() || user?.email || "Cliente",
            first_name: payerFirstName,
            last_name: payerLastName,
            email: payerEmail,
            document: address.document.replace(/\D/g, ""),
            document_type: payerDocument.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF",
            address: {
              zip_code: address.cep.replace(/\D/g, ""),
              street_name: address.street,
              street_number: address.number,
              neighborhood: address.neighborhood,
              city: address.city,
              federal_unit: address.state,
            },
          } as any,
          shipping_service: selectedShipping as any,
          status: "pending",
          payment_status: "pending",
        } as any)
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        toast.error("Erro ao criar pedido: " + orderError.message);
        setIsLoading(false);
        setIsPaying(false);
        return;
      }

      if (!order) {
        toast.error("Pedido não foi criado");
        setIsLoading(false);
        setIsPaying(false);
        return;
      }

      setOrderId(order.id);

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_image: item.product.images?.[0] || null,
        price: item.product.price,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

      if (itemsError) {
        console.error("Order items error:", itemsError);
        toast.error("Erro ao adicionar itens ao pedido: " + itemsError.message);
        setIsLoading(false);
        setIsPaying(false);
        return;
      }

      // Atualiza estoque de variantes e total do produto
      for (const item of cartItems) {
        const productInfo = stockMap[item.product_id];
        if (!productInfo) continue;

        const variants = Array.isArray(productInfo.product_variants) ? productInfo.product_variants : [];
        const hasVariants = variants.length > 0;

        if (hasVariants) {
          const variantMatch = variants.find(
            (v: any) =>
              (v.size ?? null) === (item.size ?? null) &&
              (v.color ?? null) === (item.color ?? null)
          );

          if (variantMatch) {
            const currentVariantStock = typeof variantMatch.stock === "number" ? variantMatch.stock : 0;
            const newVariantStock = Math.max(0, currentVariantStock - item.quantity);
            variantMatch.stock = newVariantStock;
          }
        } else {
          const currentStock = typeof productInfo.stock === "number" ? productInfo.stock : 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          productInfo.stock = newStock;
        }
      }

      const variantUpserts: any[] = [];
      const productStockUpdates: { id: string; stock: number }[] = [];

      Object.values(stockMap).forEach((productInfo: any) => {
        const variants = Array.isArray(productInfo.product_variants) ? productInfo.product_variants : [];
        if (variants.length > 0) {
          variantUpserts.push(
            ...variants.map((v: any) => ({
              id: v.id,
              product_id: productInfo.id,
              color: v.color ?? null,
              size: v.size ?? null,
              stock: typeof v.stock === "number" ? v.stock : 0,
            }))
          );
          const totalStock = variants.reduce(
            (sum: number, v: any) => sum + (typeof v.stock === "number" ? v.stock : 0),
            0
          );
          productStockUpdates.push({ id: productInfo.id, stock: totalStock });
        } else {
          productStockUpdates.push({
            id: productInfo.id,
            stock: typeof productInfo.stock === "number" ? productInfo.stock : 0,
          });
        }
      });

      if (variantUpserts.length > 0) {
        const { error: variantUpdateError } = await supabase
          .from("product_variants")
          .upsert(variantUpserts);

        if (variantUpdateError) {
          console.error("Variant stock update error:", variantUpdateError);
          toast.error("Pedido criado, mas houve erro ao atualizar o estoque das variações. Entre em contato.");
          setIsLoading(false);
          setIsPaying(false);
          return;
        }
      }

      if (productStockUpdates.length > 0) {
        const updates = await Promise.all(
          productStockUpdates.map((p) =>
            supabase.from("products").update({ stock: p.stock }).eq("id", p.id)
          )
        );

        const stockUpdateError = updates.find((u) => u.error);
        if (stockUpdateError?.error) {
          console.error("Stock update error:", stockUpdateError.error);
          toast.error("Pedido criado, mas houve erro ao atualizar o estoque. Entre em contato.");
          setIsLoading(false);
          setIsPaying(false);
          return;
        }
      }

      let paymentMethodId =
        paymentMethod === "pix" ? "pix" : paymentMethod === "boleto" ? "bolbradesco" : undefined;
      let token: string | undefined;
      let installments: number | undefined;
      let identificationType =
        payerDocument.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF";

      if (paymentMethod === "card") {
        const cardData =
          cardDataFromMP ?? cardFormRef.current?.getCardFormData?.();

        if (!cardData) {
          toast.error("Formulário do cartão não iniciado");
          setIsLoading(false);
          setIsPaying(false);
          return;
        }

        token = cardData.token;
        paymentMethodId = cardData.paymentMethodId;
        installments = Number(cardData.installments) || 1;
        identificationType = cardData.identificationType || identificationType;

        if (!token || !paymentMethodId) {
          toast.error("Dados do cartão incompletos");
          setIsLoading(false);
          setIsPaying(false);
          return;
        }
      }

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke("create-payment", {
        body: {
          external_reference: order.id,
          items: orderItems.map((item) => ({
            id: item.product_id,
            title: item.product_name,
            quantity: item.quantity,
            unit_price: item.price,
            picture_url: item.product_image || undefined,
            description: [item.size ? "Tam: " + item.size : null, item.color ? "Cor: " + item.color : null]
              .filter(Boolean)
              .join(" | ") || undefined,
          })),
          payer: {
            email: payerEmail,
            name: `${payerFirstName} ${payerLastName}`.trim(),
            first_name: payerFirstName,
            last_name: payerLastName,
            document: payerDocument.replace(/\D/g, ""),
            document_type: identificationType,
            statement_descriptor: "Miranda Coast",
            address: {
              zip_code: address.cep.replace(/\D/g, ""),
              street_name: address.street,
              street_number: address.number,
              neighborhood: address.neighborhood,
              city: address.city,
              federal_unit: address.state,
            },
          },
          shipping_cost: selectedShipping.price || 0,
          back_urls: {
            success: window.location.origin + "/pedido/" + order.id,
            failure: window.location.origin + "/pedido/" + order.id,
            pending: window.location.origin + "/pedido/" + order.id,
            notification: MERCADO_PAGO_WEBHOOK,
          },
          payment_method_id: paymentMethodId,
          token,
          installments,
        },
      });

      if (paymentError) {
        console.error("Payment error:", paymentError);
        toast.error("Pedido criado, mas houve erro ao iniciar o pagamento. Tente novamente.");
        navigate("/pedido/" + order.id);
        setIsLoading(false);
        setIsPaying(false);
        return;
      }

      if (paymentData?.error) {
        console.error("Payment creation error");
        toast.error(
          paymentData.status_detail
            ? `Pagamento rejeitado: ${paymentData.status_detail}`
            : paymentData.error ||
              "Não foi possível iniciar o pagamento. Acesse o pedido para tentar novamente.",
        );
        navigate("/pedido/" + order.id);
        setIsLoading(false);
        setIsPaying(false);
        return;
      }

      setPaymentResult(paymentData);
      await clearCart.mutateAsync();

      toast.success("Pagamento iniciado. Verifique o status ou finalize pelo QR/Boleto.");
    } catch (error: any) {
      console.error("Order creation error:", error);
      toast.error(error.message || "Erro ao criar pedido. Tente novamente.");
    } finally {
      setIsLoading(false);
      setIsPaying(false);
    }
  };

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-primary">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-secondary/20">
      <div className="container max-w-4xl px-4">
        <h1 className="text-3xl md:text-4xl font-serif mb-8 text-center">Checkout</h1>

        <div className="flex items-center justify-center mb-8">
          {[
            { num: 1, icon: MapPin, label: "Endereço" },
            { num: 2, icon: Package, label: "Frete" },
            { num: 3, icon: CreditCard, label: "Pagamento" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span
                className={`ml-2 hidden sm:inline ${
                  step >= s.num ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < 2 && <ChevronRight className="mx-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Endereço de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor="cep">CEP *</Label>
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={address.cep}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                          setAddress((prev) => ({ ...prev, cep: value }));
                          if (value.length === 8) fetchAddressByCep(value);
                        }}
                        maxLength={9}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="document">CPF/CNPJ *</Label>
                    <Input
                      id="document"
                      placeholder="Somente números"
                      value={address.document}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 14);
                        setAddress((prev) => ({ ...prev, document: value }));
                        setPayerDocument(value);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="street">Rua *</Label>
                    <Input
                      id="street"
                      placeholder="Nome da rua"
                      value={address.street}
                      onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        placeholder="123"
                        value={address.number}
                        onChange={(e) => setAddress((prev) => ({ ...prev, number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto, bloco..."
                        value={address.complement}
                        onChange={(e) => setAddress((prev) => ({ ...prev, complement: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Bairro"
                      value={address.neighborhood}
                      onChange={(e) => setAddress((prev) => ({ ...prev, neighborhood: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        placeholder="Cidade"
                        value={address.city}
                        onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        placeholder="UF"
                        value={address.state}
                        onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Opções de Frete</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingShipping && (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-primary">Calculando frete...</span>
                    </div>
                  )}

                  {!loadingShipping && shippingOptions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Nenhuma opção de frete disponível</p>
                      <Button onClick={calculateShipping}>Tentar novamente</Button>
                    </div>
                  )}

                  {!loadingShipping && shippingOptions.length > 0 && (
                    <div className="space-y-3">
                      {shippingOptions.map((option) => (
                        <div
                          key={option.id}
                          className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedShipping?.id === option.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedShipping(option)}
                        >
                          <input
                            type="radio"
                            name="shipping"
                            value={option.id}
                            checked={selectedShipping?.id === option.id}
                            onChange={() => setSelectedShipping(option)}
                            className="cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              {option.company} - {option.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Entrega em {option.delivery_range?.min || option.delivery_time} -{" "}
                              {option.delivery_range?.max || option.delivery_time} dias úteis
                            </p>
                          </div>
                          <p className="font-semibold text-primary whitespace-nowrap ml-2">
                            {formatPrice(option.price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 3 && (
  <Card>
    <CardHeader>
      <CardTitle className="font-serif">Pagamento</CardTitle>
    </CardHeader>

    <CardContent className="space-y-6">

      {/* Dados do pagador */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Seus dados</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome *</Label>
            <Input value={payerFirstName} onChange={(e) => setPayerFirstName(e.target.value)} />
          </div>

          <div>
            <Label>Sobrenome *</Label>
            <Input value={payerLastName} onChange={(e) => setPayerLastName(e.target.value)} />
          </div>

          <div>
            <Label>Email *</Label>
            <Input value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} />
          </div>

          <div>
            <Label>CPF/CNPJ *</Label>
            <Input
              value={payerDocument}
              onChange={(e) => setPayerDocument(e.target.value.replace(/\D/g, ""))}
              placeholder="Apenas números"
            />
          </div>
        </div>
      </div>

      {/* Forma de pagamento */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Escolha a forma de pagamento</h3>

        <Tabs
          value={paymentMethod}
          onValueChange={(v: string) => {
            setPaymentMethod(v as PaymentMethod);
            setPaymentResult(null);
          }}
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="pix">Pix</TabsTrigger>
            <TabsTrigger value="card">Cartão</TabsTrigger>
            {/* boleto oculto no front */}
          </TabsList>

          {/* PIX */}
          <TabsContent value="pix" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Pagamento instantâneo. Após confirmar, você receberá um QR Code.
            </p>
          </TabsContent>

          {/* CARTÃO */}
          <TabsContent value="card" className="space-y-4 pt-4">
            {!MERCADO_PAGO_PUBLIC_KEY && (
              <p className="text-sm text-red-500">
                Chave pública do Mercado Pago não configurada.
              </p>
            )}

            <form id="payment-form" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="form-cardholderName">Nome impresso no cartão</Label>
                  <Input id="form-cardholderName" placeholder="Ex: JOÃO SILVA" />
                </div>

                <div>
                  <Label htmlFor="form-cardNumber">Número do cartão</Label>
                  <Input id="form-cardNumber" placeholder="0000 0000 0000 0000" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="form-cardExpirationMonth">Mês</Label>
                  <Input id="form-cardExpirationMonth" placeholder="MM" />
                </div>
                <div>
                  <Label htmlFor="form-cardExpirationYear">Ano</Label>
                  <Input id="form-cardExpirationYear" placeholder="YY" />
                </div>
                <div>
                  <Label htmlFor="form-securityCode">CVV</Label>
                  <Input id="form-securityCode" placeholder="3 dígitos" />
                </div>
              </div>

              <div>
                <Label htmlFor="form-installments">Parcelas</Label>
                <select
                  id="form-installments"
                  defaultValue=""
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                </select>
              </div>

              {/* Campos obrigatórios para o SDK, mas escondidos */}
              <div className="hidden">
                <Input id="form-cardholderEmail" value={payerEmail} readOnly />

                <Input id="form-identificationNumber" value={payerDocument} readOnly />

                <select
                  id="form-identificationType"
                  defaultValue={payerDocument.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF"}
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                </select>

                <select id="form-issuer">
                  <option value="">Selecionar</option>
                </select>
              </div>

              {cardFormError && (
                <p className="text-sm text-red-500">{cardFormError}</p>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </div>

      {/* Resultado do pagamento (Pix / etc.) */}
      {paymentResult && (
        <div className="p-4 border rounded-md space-y-2 bg-secondary/40">
          <p className="font-medium">Status: {paymentResult.status || "pendente"}</p>

          {paymentResult.qr_code_base64 && (
            <div className="space-y-2">
              <p className="text-sm">Escaneie o QR para pagar</p>
              <img
                src={`data:image/png;base64,${paymentResult.qr_code_base64}`}
                alt="QR Code Pix"
                className="w-48 h-48"
              />
              {paymentResult.qr_code && (
                <div className="flex items-center gap-2">
                  <Textarea readOnly value={paymentResult.qr_code} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(paymentResult.qr_code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {paymentResult.ticket_url && (
            <div className="space-y-2">
              <p className="text-sm">Link para pagamento:</p>
              <a
                className="text-primary underline"
                href={paymentResult.ticket_url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir link
              </a>
            </div>
          )}

          <Button variant="outline" onClick={() => orderId && navigate("/pedido/" + orderId)}>
            Ver pedido
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
)}

            <div className="flex gap-4 mt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}

              <div className="flex-1" />

              {step < 3 && (
                <Button onClick={handleNextStep} disabled={loadingShipping}>
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              {step === 3 && (
                <Button
                  onClick={() => {
                    if (paymentMethod === "card") {
                      if (!cardFormRef.current?.submit) {
                        toast.error("Formulário do cartão não iniciado");
                        return;
                      }
                      cardFormRef.current.submit();
                    } else {
                      handleCreateOrder();
                    }
                  }}
                  disabled={isLoading || isPaying}
                  className="bg-[#009ee3] hover:bg-[#007eb5]"
                >
                  {isPaying ? "Processando..." : "Pagar agora"}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-serif">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.product.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      <p className="text-sm font-semibold">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  {selectedShipping && (
                    <div className="flex justify-between text-sm">
                      <span>Frete</span>
                      <span>{formatPrice(selectedShipping.price)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
