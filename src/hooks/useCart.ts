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
            stock
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        product: item.products || { id: '', name: '', price: 0, images: [], stock: 0 },
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
        .select('sizes, colors, name, stock, is_active')
        .eq('id', productId)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) throw new Error('Produto não encontrado');

      const availableStock = typeof product.stock === 'number' ? product.stock : 0;

      if (!product.is_active || availableStock <= 0) {
        throw new Error(`${product.name || 'Produto'} está esgotado no momento.`);
      }

      const sizeRequired = Array.isArray(product?.sizes) && product.sizes.length > 0;
      const colorRequired = Array.isArray(product?.colors) && product.colors.length > 0;

      if (sizeRequired && !size) {
        throw new Error(`Selecione um tamanho para ${product?.name || 'o produto'}`);
      }

      if (colorRequired && !color) {
        throw new Error(`Selecione uma cor para ${product?.name || 'o produto'}`);
      }

      const sizeValue = size || null;
      const colorValue = color || null;

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
        .select(`product_id, products (stock, name)`)
        .eq('id', itemId)
        .single();

      if (cartItemError) throw cartItemError;

      const productName = cartItem?.products?.name || 'o produto';
      const availableStock = typeof cartItem?.products?.stock === 'number' ? cartItem.products.stock : 0;

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
