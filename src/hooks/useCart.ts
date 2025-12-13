import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  size: string | null;
  color: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stock?: number;
    product_variants?: {
      id?: string;
      color?: string | null;
      size?: string | null;
      stock?: number | null;
    }[];
  };
}

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          size,
          color,
          products (
            id,
            name,
            price,
            images,
            stock,
            product_variants (id, color, size, stock)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        product: item.products || { id: '', name: '', price: 0, images: [], stock: 0, product_variants: [] },
      })) as CartItem[];
    },
    enabled: !!user,
  });

  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1, size, color }: {
      productId: string;
      quantity?: number;
      size?: string;
      color?: string;
    }) => {
      if (!user) throw new Error('Você precisa estar logado');

      // Validate required variations and available stock for the product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('sizes, colors, name, stock, is_active, product_variants (id, color, size, stock)')
        .eq('id', productId)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) throw new Error('Produto não encontrado');

      const variants = Array.isArray((product as any).product_variants) ? (product as any).product_variants : [];
      const hasVariants = variants.length > 0;

      const sizeOptions = Array.isArray(product?.sizes) ? product.sizes : [];
      const colorOptions = Array.isArray(product?.colors) ? product.colors : [];
      const variantRequiresSize = hasVariants && variants.some((v: any) => v.size);
      const variantRequiresColor = hasVariants && variants.some((v: any) => v.color);

      if (!product.is_active) {
        throw new Error(`${product.name || 'Produto'} está esgotado no momento.`);
      }

      const sizeRequired = sizeOptions.length > 0 || variantRequiresSize;
      const colorRequired = colorOptions.length > 0 || variantRequiresColor;

      if (sizeRequired && !size) {
        throw new Error(`Selecione um tamanho para ${product?.name || 'o produto'}`);
      }

      if (colorRequired && !color) {
        throw new Error(`Selecione uma cor para ${product?.name || 'o produto'}`);
      }

      const sizeValue = size || null;
      const colorValue = color || null;

      const variantMatch = hasVariants
        ? variants.find(
            (v: any) =>
              (v.size ?? null) === sizeValue &&
              (v.color ?? null) === colorValue
          )
        : null;

      const availableStock = hasVariants
        ? typeof variantMatch?.stock === 'number'
          ? variantMatch.stock
          : 0
        : typeof product.stock === 'number'
        ? product.stock
        : 0;

      if (hasVariants && !variantMatch) {
        throw new Error('Selecione uma combinação válida de cor e tamanho.');
      }

      if (availableStock <= 0) {
        throw new Error(`${product.name || 'Produto'} está esgotado no momento.`);
      }

      // Check if item already exists with the same variations
      let query = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      query = sizeValue === null ? query.is('size', null) : query.eq('size', sizeValue);
      query = colorValue === null ? query.is('color', null) : query.eq('color', colorValue);

      const { data: existing } = await query.maybeSingle();

      const desiredQuantity = (existing?.quantity || 0) + quantity;
      if (desiredQuantity > availableStock) {
        throw new Error(`Temos apenas ${availableStock} unidade(s) de ${product.name || 'estoque'} no momento.`);
      }

      if (existing) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity,
            size: sizeValue,
            color: colorValue,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Produto adicionado ao carrinho');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar ao carrinho');
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (!user) throw new Error('Você precisa estar logado');

      const { data: cartItem, error: cartItemError } = await supabase
        .from('cart_items')
        .select(`product_id, size, color, products (stock, name, product_variants (id, color, size, stock))`)
        .eq('id', itemId)
        .single();

      if (cartItemError) throw cartItemError;

      const productName = cartItem?.products?.name || 'o produto';
      const variants = Array.isArray(cartItem?.products?.product_variants)
        ? cartItem.products.product_variants
        : [];
      const hasVariants = variants.length > 0;

      const variantMatch = hasVariants
        ? variants.find(
            (v: any) =>
              (v.size ?? null) === (cartItem.size ?? null) &&
              (v.color ?? null) === (cartItem.color ?? null)
          )
        : null;

      const availableStock = hasVariants
        ? typeof variantMatch?.stock === 'number'
          ? variantMatch.stock
          : 0
        : typeof cartItem?.products?.stock === 'number'
        ? cartItem.products.stock
        : 0;

      if (hasVariants && !variantMatch) {
        throw new Error('Combinação de cor/tamanho não encontrada para este item.');
      }

      if (availableStock <= 0) {
        throw new Error(`${productName} está esgotado.`);
      }

      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
        return;
      }

      if (availableStock <= 0) {
        throw new Error(`${productName} está esgotado.`);
      }

      if (quantity > availableStock) {
        throw new Error(`Quantidade indisponível. Estoque atual de ${productName}: ${availableStock}.`);
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar quantidade');
    },
  });

  const removeFromCart = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Produto removido do carrinho');
    },
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount,
  };
};
