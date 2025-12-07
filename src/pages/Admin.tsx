import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ImageUpload';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Package, Megaphone, ShieldAlert, ClipboardList, Eye, EyeOff, Image as ImageIcon, Layers } from 'lucide-react';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { AnnouncementsTab } from '@/pages/admin/tabs/AnnouncementsTab';
import { CategoriesTab } from '@/pages/admin/tabs/CategoriesTab';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const defaultCategories = ['Vestidos','Conjuntos','Blusas','Croppeds','Bodys','Calcas','Saias'];

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const queryClient = useQueryClient();
  
  const [productDialog, setProductDialog] = useState(false);
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: 'Vestidos',
    price: '',
    original_price: '',
    stock: '',
    sizes: '',
    colors: '',
    images: [] as string[],
    is_active: true,
  });
  
  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    is_active: true,
    display_order: 0,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    image_url: '',
    display_order: 0,
    is_active: true,
  });

  // Hero settings form state
  const [heroForm, setHeroForm] = useState({
    image_url: '',
    title: 'Miranda Costa Chic',
    subtitle: 'Moda Feminina de Luxo',
    cta_text: 'Explorar Coleção',
    cta_link: '/loja',
    is_active: true,
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch announcements
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch hero settings - usando client.from() sem tipos
  const { data: heroSettings = null, refetch: refetchHeroSettings } = useQuery({
    queryKey: ['admin-hero-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('hero_settings')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(1)
          .single();
        
        if (error) {
          console.warn('Could not fetch hero settings:', error.message);
          return null;
        }
        return data || null;
      } catch (e) {
        console.warn('Hero settings fetch error:', e);
        return null;
      }
    },
    enabled: isAdmin,
    retry: false,
  });

  const { data: categoryList = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const productCategories = categoryList.length ? categoryList.map((cat: any) => cat.name) : defaultCategories;

  useEffect(() => {
    if (!editingProduct && productCategories.length && !productCategories.includes(productForm.category)) {
      setProductForm(p => ({ ...p, category: productCategories[0] }));
    }
  }, [productCategories, editingProduct]);

  // Carregar hero settings quando disponível
  useEffect(() => {
    if (heroSettings) {
      setHeroForm({
        image_url: heroSettings.image_url || '',
        title: heroSettings.title || 'Miranda Costa Chic',
        subtitle: heroSettings.subtitle || 'Moda Feminina de Luxo',
        cta_text: heroSettings.cta_text || 'Explorar Coleção',
        cta_link: heroSettings.cta_link || '/loja',
        is_active: heroSettings.is_active !== false,
      });
    }
  }, [heroSettings]);

  // Product mutations
  const saveProduct = useMutation({
    mutationFn: async (product: any) => {
      const productData = {
        name: product.name,
        description: product.description,
        category: product.category,
        price: parseFloat(product.price),
        original_price: product.original_price ? parseFloat(product.original_price) : null,
        stock: parseInt(product.stock) || 0,
        sizes: product.sizes.split(',').map((s: string) => s.trim()).filter(Boolean),
        colors: product.colors.split(',').map((c: string) => c.trim()).filter(Boolean),
        images: product.images,
        is_active: product.is_active,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductDialog(false);
      resetProductForm();
      toast.success(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar produto: ' + error.message);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      // Ao invés de deletar, apenas desativamos o produto
      // Isso preserva os históricos de pedidos que referenciam este produto
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto desativado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover produto: ' + error.message);
    },
  });

  const toggleProductStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isActive ? 'Produto desativado!' : 'Produto ativado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  // Announcement mutations
  const saveAnnouncement = useMutation({
    mutationFn: async (announcement: any) => {
      const announcementData = {
        title: announcement.title,
        description: announcement.description,
        image_url: announcement.image_url || null,
        link_url: announcement.link_url || null,
        is_active: announcement.is_active,
        display_order: announcement.display_order,
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(announcementData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setAnnouncementDialog(false);
      resetAnnouncementForm();
      toast.success(editingAnnouncement ? 'Anúncio atualizado!' : 'Anúncio criado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar anúncio: ' + error.message);
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Anúncio removido!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover anúncio: ' + error.message);
    },
  });

  const saveHeroSettings = useMutation({
    mutationFn: async (heroSettings: any) => {
      if (!heroSettings.image_url) {
        throw new Error('Imagem é obrigatória');
      }

      // Tenta atualizar primeiro (se já existe um hero ativo)
      const { data: existingHero } = await supabase
        .from('hero_settings')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (existingHero) {
        // Atualizar hero existente
        const { error } = await supabase
          .from('hero_settings')
          .update({
            image_url: heroSettings.image_url,
            title: heroSettings.title,
            subtitle: heroSettings.subtitle,
            cta_text: heroSettings.cta_text,
            cta_link: heroSettings.cta_link,
            is_active: heroSettings.is_active,
          })
          .eq('id', existingHero.id);
        if (error) throw error;
      } else {
        // Criar novo hero
        const { error } = await supabase
          .from('hero_settings')
          .insert({
            image_url: heroSettings.image_url,
            title: heroSettings.title,
            subtitle: heroSettings.subtitle,
            cta_text: heroSettings.cta_text,
            cta_link: heroSettings.cta_link,
            is_active: heroSettings.is_active,
            display_order: 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidar queries para forçar recarga
      queryClient.invalidateQueries({ queryKey: ['hero-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-hero-settings'] });
      toast.success('Configurações da hero atualizadas com sucesso!');
    },
    onError: (error: any) => {
      console.error('Hero save error:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
    },
  });


  const saveCategory = useMutation({
    mutationFn: async (category: any) => {
      if (!category.name) {
        throw new Error('Nome obrigat�rio');
      }

      const payload = {
        name: category.name,
        image_url: category.image_url || null,
        display_order: category.display_order || 0,
        is_active: category.is_active,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryDialog(false);
      resetCategoryForm();
      toast.success(editingCategory ? 'Categoria atualizada!' : 'Categoria criada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar categoria: ' + error.message);
    },
  });

  const toggleCategoryStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(isActive ? 'Categoria desativada!' : 'Categoria ativada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar categoria: ' + error.message);
    },
  });

  const resetProductForm = () => {
    setProductForm({
      name: '', description: '', category: productCategories[0] || 'Vestidos', price: '',
      original_price: '', stock: '', sizes: '', colors: '', images: [], is_active: true,
    });
    setEditingProduct(null);
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: '', description: '', image_url: '', link_url: '', is_active: true, display_order: 0,
    });
    setEditingAnnouncement(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      image_url: '',
      display_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
  };


  const openEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      stock: product.stock.toString(),
      sizes: product.sizes?.join(', ') || '',
      colors: product.colors?.join(', ') || '',
      images: product.images || [],
      is_active: product.is_active,
    });
    setProductDialog(true);
  };

  const openEditAnnouncement = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      description: announcement.description || '',
      image_url: announcement.image_url || '',
      link_url: announcement.link_url || '',
      is_active: announcement.is_active,
      display_order: announcement.display_order,
    });
    setAnnouncementDialog(true);
  };

  const openEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      image_url: category.image_url || '',
      display_order: category.display_order || 0,
      is_active: category.is_active,
    });
    setCategoryDialog(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-serif mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-serif mb-8">Painel Administrativo</h1>
        
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Anúncios
            </TabsTrigger>
            <TabsTrigger value="hero" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Hero
            </TabsTrigger>
          </TabsList>
          
          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
          
          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produtos ({products.length})</CardTitle>
                <Dialog open={productDialog} onOpenChange={(open) => {
                  setProductDialog(open);
                  if (!open) resetProductForm();
                }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>Nome *</Label>
                          <Input
                            value={productForm.name}
                            onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Descrição</Label>
                          <Textarea
                            value={productForm.description}
                            onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Categoria *</Label>
                          <Select
                            value={productForm.category}
                            onValueChange={(v) => setProductForm(p => ({ ...p, category: v }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {productCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Estoque</Label>
                          <Input
                            type="number"
                            value={productForm.stock}
                            onChange={(e) => setProductForm(p => ({ ...p, stock: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Preço *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={productForm.price}
                            onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Preço Original (promoção)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Deixe vazio se não houver"
                            value={productForm.original_price}
                            onChange={(e) => setProductForm(p => ({ ...p, original_price: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Tamanhos (separados por vírgula)</Label>
                          <Input
                            placeholder="P, M, G, GG"
                            value={productForm.sizes}
                            onChange={(e) => setProductForm(p => ({ ...p, sizes: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Cores (separadas por vírgula)</Label>
                          <Input
                            placeholder="Azul, Branco, Rosa"
                            value={productForm.colors}
                            onChange={(e) => setProductForm(p => ({ ...p, colors: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>URLs das Imagens (separadas por vírgula)</Label>
                          <Textarea
                            placeholder="https://exemplo.com/imagem1.jpg, https://exemplo.com/imagem2.jpg"
                            value={productForm.images}
                            onChange={(e) => setProductForm(p => ({ ...p, images: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <Switch
                            checked={productForm.is_active}
                            onCheckedChange={(v) => setProductForm(p => ({ ...p, is_active: v }))}
                          />
                          <Label>Produto ativo</Label>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => saveProduct.mutate(productForm)}
                        disabled={saveProduct.isPending || !productForm.name || !productForm.price}
                      >
                        {saveProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado</p>
                ) : (
                  <div className="space-y-3">
                    {products.map((product: any) => (
                      <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{product.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {product.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{product.category} • Estoque: {product.stock}</p>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">{formatPrice(product.price)}</span>
                            {product.original_price && (
                              <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(product.original_price)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleProductStatus.mutate({ id: product.id, isActive: product.is_active })}
                            disabled={toggleProductStatus.isPending}
                          >
                            {product.is_active ? (
                              <EyeOff className="h-4 w-4 text-destructive" />
                            ) : (
                              <Eye className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Categories Tab */}
          <TabsContent value="categories">
            <CategoriesTab
              categories={categoryList}
              isLoading={categoriesLoading}
              dialogOpen={categoryDialog}
              setDialogOpen={setCategoryDialog}
              categoryForm={categoryForm}
              setCategoryForm={setCategoryForm}
              editingCategory={editingCategory}
              openEditCategory={openEditCategory}
              resetCategoryForm={resetCategoryForm}
              saveCategory={saveCategory}
              toggleCategoryStatus={toggleCategoryStatus}
            />
          </TabsContent>

          {/* Hero Settings Tab */}          {/* Hero Settings Tab */}
          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Gerenciar Imagem Hero
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <Label>Imagem Hero *</Label>
                      <ImageUpload
                        label=""
                        onImageUpload={(url) => setHeroForm(h => ({ ...h, image_url: url }))}
                        currentImage={heroForm.image_url}
                        folder="hero"
                      />
                      {heroForm.image_url && (
                        <p className="text-sm text-muted-foreground mt-2">✓ Imagem selecionada</p>
                      )}
                    </div>

                    <div>
                      <Label>Título</Label>
                      <Input
                        value={heroForm.title}
                        onChange={(e) => setHeroForm(h => ({ ...h, title: e.target.value }))}
                        placeholder="Miranda Costa Chic"
                      />
                    </div>

                    <div>
                      <Label>Subtítulo</Label>
                      <Input
                        value={heroForm.subtitle}
                        onChange={(e) => setHeroForm(h => ({ ...h, subtitle: e.target.value }))}
                        placeholder="Moda Feminina de Luxo"
                      />
                    </div>

                    <div>
                      <Label>Texto do Botão</Label>
                      <Input
                        value={heroForm.cta_text}
                        onChange={(e) => setHeroForm(h => ({ ...h, cta_text: e.target.value }))}
                        placeholder="Explorar Coleção"
                      />
                    </div>

                    <div>
                      <Label>Link do Botão</Label>
                      <Input
                        value={heroForm.cta_link}
                        onChange={(e) => setHeroForm(h => ({ ...h, cta_link: e.target.value }))}
                        placeholder="/loja"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={heroForm.is_active}
                        onCheckedChange={(v) => setHeroForm(h => ({ ...h, is_active: v }))}
                      />
                      <Label>Ativo</Label>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => saveHeroSettings.mutate(heroForm)}
                      disabled={!heroForm.image_url || saveHeroSettings.isPending}
                    >
                      {saveHeroSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Salvar Configurações
                    </Button>
                  </div>

                  {/* Preview */}
                  <div>
                    <Label>Pré-visualização</Label>
                    <div className="relative h-64 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border">
                      {heroForm.image_url ? (
                        <>
                          <img
                            src={heroForm.image_url}
                            alt="Hero preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/20 to-background/90 flex items-center justify-center">
                            <div className="text-center text-white">
                              <h2 className="text-2xl font-serif mb-2">{heroForm.title}</h2>
                              <p className="text-sm mb-4">{heroForm.subtitle}</p>
                              <span className="px-4 py-2 bg-white text-primary rounded text-sm font-medium">
                                {heroForm.cta_text}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">Selecione uma imagem para ver a pré-visualização</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
