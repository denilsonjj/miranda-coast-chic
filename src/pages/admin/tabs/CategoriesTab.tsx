import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { Loader2, Plus, Edit, EyeOff, Eye, Layers } from "lucide-react";

type CategoryForm = {
  name: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
};

type CategoriesTabProps = {
  categories: any[];
  isLoading: boolean;
  dialogOpen: boolean;
  setDialogOpen: (v: boolean) => void;
  categoryForm: CategoryForm;
  setCategoryForm: React.Dispatch<React.SetStateAction<CategoryForm>>;
  editingCategory: any;
  openEditCategory: (category: any) => void;
  resetCategoryForm: () => void;
  saveCategory: any;
  toggleCategoryStatus: any;
};

export const CategoriesTab = ({
  categories,
  isLoading,
  dialogOpen,
  setDialogOpen,
  categoryForm,
  setCategoryForm,
  editingCategory,
  openEditCategory,
  resetCategoryForm,
  saveCategory,
  toggleCategoryStatus,
}: CategoriesTabProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categorias ({categories.length})</CardTitle>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetCategoryForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 pb-20">
              <div>
                <Label>Nome *</Label>
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Imagem</Label>
                <ImageUpload
                  label=""
                  onImageUpload={(url) => setCategoryForm((c) => ({ ...c, image_url: url }))}
                  currentImage={categoryForm.image_url}
                  onRemoveImage={() => setCategoryForm((c) => ({ ...c, image_url: "" }))}
                  folder="categories"
                  helperText="Envie uma imagem ou remova para trocar"
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm((c) => ({ ...c, display_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={categoryForm.is_active}
                  onCheckedChange={(v) => setCategoryForm((c) => ({ ...c, is_active: v }))}
                />
                <Label>Categoria ativa</Label>
              </div>
              <div className="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur border-t pt-3">
                <Button
                  className="w-full"
                  onClick={() => saveCategory.mutate(categoryForm)}
                  disabled={saveCategory.isPending || !categoryForm.name}
                >
                  {saveCategory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category: any) => (
              <div key={category.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                  {category.image_url ? (
                    <img src={category.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{category.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-muted">
                      Ordem {category.display_order ?? 0}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${category.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {category.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleCategoryStatus.mutate({ id: category.id, isActive: category.is_active })}
                    disabled={toggleCategoryStatus.isPending}
                  >
                    {category.is_active ? (
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
  );
};
