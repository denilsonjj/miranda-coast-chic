import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, ArrowLeft, Heart } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);

  // Fetch product
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID not found');
      
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants (id, color, size, stock)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const variants = Array.isArray(product?.product_variants) ? product.product_variants : [];
  const hasVariants = variants.length > 0;
  const selectedVariant = hasVariants
    ? variants.find((v) => {
        const sizeMatch = v.size ? v.size === selectedSize : true;
        const colorMatch = v.color ? v.color === selectedColor : true;
        return sizeMatch && colorMatch;
      })
    : null;

  const availableSizes = hasVariants
    ? Array.from(
        new Set(
          variants
            .filter((v) => {
              if (selectedColor && v.color) return v.color === selectedColor;
              return true;
            })
            .map((v) => v.size)
            .filter(Boolean) as string[]
        )
      )
    : Array.isArray(product?.sizes)
    ? product.sizes
    : [];

  const availableColors = hasVariants
    ? Array.from(
        new Set(
          variants
            .filter((v) => {
              if (selectedSize && v.size) return v.size === selectedSize;
              return true;
            })
            .map((v) => v.color)
            .filter(Boolean) as string[]
        )
      )
    : Array.isArray(product?.colors)
    ? product.colors
    : [];

  useEffect(() => {
    if (hasVariants) {
      if (selectedSize && !availableSizes.includes(selectedSize)) {
        setSelectedSize("");
      }
      if (selectedColor && !availableColors.includes(selectedColor)) {
        setSelectedColor("");
      }
    }
  }, [selectedSize, selectedColor, availableSizes, availableColors, hasVariants]);

  const availableStock = hasVariants
    ? selectedVariant
      ? typeof selectedVariant.stock === 'number'
        ? selectedVariant.stock
        : 0
      : 0
    : typeof product?.stock === 'number'
    ? product.stock
    : 0;

  const isOutOfStock = hasVariants
    ? selectedVariant
      ? availableStock <= 0
      : false
    : availableStock <= 0;
  const lowStock = availableStock > 0 && availableStock <= 5;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    // Validar seleção de tamanho
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Por favor, selecione um tamanho');
      return;
    }

    if (product?.colors && product.colors.length > 0 && !selectedColor) {
      toast.error('Por favor, selecione uma cor');
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado para adicionar ao carrinho');
      navigate('/auth');
      return;
    }

    if (hasVariants) {
      if (!selectedVariant) {
        toast.error('Selecione cor e tamanho para continuar.');
        return;
      }
      const variantStock = typeof selectedVariant.stock === 'number' ? selectedVariant.stock : 0;
      if (variantStock <= 0) {
        toast.error('Esta combinação está esgotada no momento.');
        return;
      }
      if (quantity > variantStock) {
        toast.error(`Só temos ${variantStock} unidade(s) disponíveis para esta combinação.`);
        setQuantity(variantStock);
        return;
      }
    } else {
      const fallbackStock = typeof product.stock === 'number' ? product.stock : 0;
      if (fallbackStock <= 0) {
        toast.error('Este produto está esgotado no momento.');
        return;
      }
      if (quantity > fallbackStock) {
        toast.error(`Só temos ${fallbackStock} unidade(s) disponíveis.`);
        setQuantity(fallbackStock);
        return;
      }
    }

    setIsAddingToCart(true);
    try {
      await addToCart.mutateAsync({
        productId: product.id,
        quantity,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
      });
      
      toast.success('Produto adicionado ao carrinho!');
      // Reset form
      setSelectedSize('');
      setSelectedColor('');
      setQuantity(1);
    } catch (error: any) {
      toast.error('Erro ao adicionar ao carrinho: ' + error.message);
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="container max-w-4xl px-4">
          <div className="text-center">
            <h1 className="text-2xl font-serif mb-4">Produto não encontrado</h1>
            <Button onClick={() => navigate('/loja')}>Voltar à loja</Button>
          </div>
        </div>
      </div>
    );
  }

  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-6xl px-4">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground">Sem imagem</span>
                </div>
              )}
            </div>

            {/* Thumbnail images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === idx
                        ? 'border-primary'
                        : 'border-muted hover:border-border'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="space-y-6">
            {/* Category and Title */}
            <div>
              <Badge variant="outline" className="mb-3">{product.category}</Badge>
              <h1 className="text-4xl font-serif mb-2">{product.name}</h1>
              {product.description && (
                <p className="text-muted-foreground text-lg">{product.description}</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold text-primary">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg line-through text-muted-foreground">
                      {formatPrice(product.original_price)}
                    </span>
                    <Badge className="bg-red-100 text-red-800">-{discountPercentage}%</Badge>
                  </>
                )}
              </div>
            </div>

            {/* Size Selection */}
            {availableSizes && availableSizes.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-semibold">
                  Tamanho *
                  {!selectedSize && <span className="text-red-500 ml-1">(obrigatório)</span>}
                </label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className={selectedSize ? '' : 'border-red-300'}>
                    <SelectValue placeholder="Selecione um tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedSize && (
                  <p className="text-xs text-red-500">É necessário selecionar um tamanho</p>
                )}
              </div>
            )}

            {/* Color Selection */}
            {availableColors && availableColors.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-semibold">Cor</label>
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedColor && (
                  <p className="text-xs text-red-500">Selecione uma cor para continuar</p>
                )}
              </div>
            )}

            {/* Quantity Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold">Quantidade</label>
              <div className="flex items-center border rounded-lg w-fit">
                <button
                  onClick={() => setQuantity((prev) => Math.max(1, Math.min(prev - 1, Math.max(availableStock, 1))))}
                  className="px-4 py-2 hover:bg-muted transition-colors"
                  disabled={isOutOfStock || quantity <= 1 || (hasVariants && !selectedVariant)}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={Math.max(availableStock, 1)}
                  value={quantity}
                  onChange={(e) => {
                    const next = Math.max(1, parseInt(e.target.value) || 1);
                    const capped = availableStock ? Math.min(next, availableStock) : next;
                    setQuantity(capped);
                  }}
                  className="w-12 text-center border-x py-2 focus:outline-none"
                  disabled={isOutOfStock || (hasVariants && !selectedVariant)}
                />
                <button
                  onClick={() =>
                    setQuantity((prev) =>
                      availableStock ? Math.min(prev + 1, availableStock) : prev + 1
                    )
                  }
                  className="px-4 py-2 hover:bg-muted transition-colors"
                  disabled={
                    isOutOfStock ||
                    (hasVariants && !selectedVariant) ||
                    (availableStock ? quantity >= availableStock : false)
                  }
                >
                  +
                </button>
              </div>
              <div className="space-y-1">
                {hasVariants && !selectedVariant ? (
                  <p className="text-sm text-muted-foreground">
                    Selecione cor e tamanho para ver o estoque disponível.
                  </p>
                ) : isOutOfStock ? (
                  <p className="text-sm text-red-600">Este produto está esgotado no momento.</p>
                ) : (
                  <>
                    <p
                      className={`text-sm ${
                        lowStock ? 'text-amber-600' : 'text-muted-foreground'
                      }`}
                    >
                      {lowStock
                        ? `Restam apenas ${availableStock} unidade(s) em estoque.`
                        : `Estoque disponível: ${availableStock} unidade(s).`}
                    </p>
                    {quantity >= availableStock && availableStock > 0 && (
                      <p className="text-xs text-amber-700">
                        Limite máximo disponível atingido.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="flex gap-3 pt-4">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={
                  isAddingToCart ||
                  isOutOfStock ||
                  !product.is_active ||
                  (product.sizes && product.sizes.length > 0 && !selectedSize) ||
                  (product.colors && product.colors.length > 0 && !selectedColor)
                }
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-500' : ''}`}
                />
              </Button>
            </div>

            {/* Stock Warning */}
            {(!product.is_active || isOutOfStock) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                {!product.is_active
                  ? 'Este produto não está disponível no momento'
                  : 'Este produto está esgotado no momento'}
              </div>
            )}

            {/* Product Info */}
            <Card className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Detalhes do Produto</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {product.sizes && product.sizes.length > 0 && (
                      <li><strong>Tamanhos disponíveis:</strong> {product.sizes.join(', ')}</li>
                    )}
                    {product.colors && product.colors.length > 0 && (
                      <li><strong>Cores disponíveis:</strong> {product.colors.join(', ')}</li>
                    )}
                    <li><strong>Categoria:</strong> {product.category}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
