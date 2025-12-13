import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { Loader2, Megaphone, Edit, EyeOff, Eye, Plus, Trash2 } from "lucide-react";

type AnnouncementForm = {
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  display_order: number;
};

type AnnouncementsTabProps = {
  announcements: any[];
  isLoading: boolean;
  dialogOpen: boolean;
  setDialogOpen: (v: boolean) => void;
  announcementForm: AnnouncementForm;
  setAnnouncementForm: React.Dispatch<React.SetStateAction<AnnouncementForm>>;
  editingAnnouncement: any;
  openEditAnnouncement: (announcement: any) => void;
  resetAnnouncementForm: () => void;
  saveAnnouncement: any;
  deleteAnnouncement: any;
};

export const AnnouncementsTab = ({
  announcements,
  isLoading,
  dialogOpen,
  setDialogOpen,
  announcementForm,
  setAnnouncementForm,
  editingAnnouncement,
  openEditAnnouncement,
  resetAnnouncementForm,
  saveAnnouncement,
  deleteAnnouncement,
}: AnnouncementsTabProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Anúncios e Promoções ({announcements.length})</CardTitle>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetAnnouncementForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingAnnouncement ? "Editar Anúncio" : "Novo Anúncio"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 pb-24">
              <div>
                <Label>Título *</Label>
                <Input
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm((a) => ({ ...a, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={announcementForm.description}
                  onChange={(e) => setAnnouncementForm((a) => ({ ...a, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem do Anúncio</Label>
                <ImageUpload
                  label=""
                  onImageUpload={(url) => setAnnouncementForm((a) => ({ ...a, image_url: url }))}
                  currentImage={announcementForm.image_url}
                  onRemoveImage={() => setAnnouncementForm((a) => ({ ...a, image_url: "" }))}
                  folder="announcements"
                  helperText="Envie uma imagem ou remova para trocar"
                />
              </div>
              <div>
                <Label>Link (ao clicar)</Label>
                <Input
                  placeholder="/loja ou https://..."
                  value={announcementForm.link_url}
                  onChange={(e) => setAnnouncementForm((a) => ({ ...a, link_url: e.target.value }))}
                />
              </div>
              <div>
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={announcementForm.display_order}
                  onChange={(e) =>
                    setAnnouncementForm((a) => ({ ...a, display_order: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={announcementForm.is_active}
                  onCheckedChange={(v) => setAnnouncementForm((a) => ({ ...a, is_active: v }))}
                />
                <Label>Anúncio ativo</Label>
              </div>
              <div className="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur border-t pt-3">
                <Button
                  className="w-full"
                  onClick={() => saveAnnouncement.mutate(announcementForm)}
                  disabled={saveAnnouncement.isPending || !announcementForm.title}
                >
                  {saveAnnouncement.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingAnnouncement ? "Salvar Alterações" : "Criar Anúncio"}
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
                  <span
                    className={`text-xs px-2 py-1 rounded ${announcement.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {announcement.is_active ? "Ativo" : "Inativo"}
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
  );
};
