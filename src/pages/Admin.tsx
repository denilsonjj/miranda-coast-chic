import { useState } from 'react';
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
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Package, Megaphone, ShieldAlert, ClipboardList } from 'lucide-react';
import { OrdersTab } from '@/components/admin/OrdersTab';
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

const categories = ["Vestidos", "Conjuntos", "Blusas", "Croppeds", "Bodys", "Calças", "Saias"];

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const queryClient = useQueryClient();
  
  const [productDialog, setProductDialog] = useState(false);
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  
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
    images: '',
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
        images: product.images.split(',').map((i: string) => i.trim()).filter(Boolean),
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
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto removido!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover produto: ' + error.message);
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

  const resetProductForm = () => {
    setProductForm({
      name: '', description: '', category: 'Vestidos', price: '',
      original_price: '', stock: '', sizes: '', colors: '', images: '', is_active: true,
    });
    setEditingProduct(null);
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: '', description: '', image_url: '', link_url: '', is_active: true, display_order: 0,
    });
    setEditingAnnouncement(null);
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
      images: product.images?.join(', ') || '',
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
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Anúncios
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
                              {categories.map(cat => (
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
                        <div>
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
                          <p className="font-medium truncate">{product.name}</p>
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
                          <span className={`text-xs px-2 py-1 rounded ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProduct.mutate(product.id)}
                            disabled={deleteProduct.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Anúncios e Promoções ({announcements.length})</CardTitle>
                <Dialog open={announcementDialog} onOpenChange={(open) => {
                  setAnnouncementDialog(open);
                  if (!open) resetAnnouncementForm();
                }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Novo Anúncio</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingAnnouncement ? 'Editar Anúncio' : 'Novo Anúncio'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Título *</Label>
                        <Input
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm(a => ({ ...a, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={announcementForm.description}
                          onChange={(e) => setAnnouncementForm(a => ({ ...a, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>URL da Imagem</Label>
                        <Input
                          placeholder="https://exemplo.com/banner.jpg"
                          value={announcementForm.image_url}
                          onChange={(e) => setAnnouncementForm(a => ({ ...a, image_url: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Link (ao clicar)</Label>
                        <Input
                          placeholder="/loja ou https://..."
                          value={announcementForm.link_url}
                          onChange={(e) => setAnnouncementForm(a => ({ ...a, link_url: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Ordem de exibição</Label>
                        <Input
                          type="number"
                          value={announcementForm.display_order}
                          onChange={(e) => setAnnouncementForm(a => ({ ...a, display_order: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={announcementForm.is_active}
                          onCheckedChange={(v) => setAnnouncementForm(a => ({ ...a, is_active: v }))}
                        />
                        <Label>Anúncio ativo</Label>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => saveAnnouncement.mutate(announcementForm)}
                        disabled={saveAnnouncement.isPending || !announcementForm.title}
                      >
                        {saveAnnouncement.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {editingAnnouncement ? 'Salvar Alterações' : 'Criar Anúncio'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {announcementsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : announcements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum anúncio cadastrado</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement: any) => (
                      <div key={announcement.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                          {announcement.image_url ? (
                            <img src={announcement.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Megaphone className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{announcement.title}</p>
                          {announcement.description && (
                            <p className="text-sm text-muted-foreground truncate">{announcement.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Ordem: {announcement.display_order}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${announcement.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {announcement.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => openEditAnnouncement(announcement)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAnnouncement.mutate(announcement.id)}
                            disabled={deleteAnnouncement.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
