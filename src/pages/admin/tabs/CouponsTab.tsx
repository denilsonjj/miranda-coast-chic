import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Tag, Plus, Edit, EyeOff, Eye } from "lucide-react";

type CouponForm = {
  id?: string;
  code: string;
  type: "percent" | "amount";
  value: string;
  min_order_value: string;
  expires_at: string;
  is_active: boolean;
};

type CouponsTabProps = {
  coupons: any[];
  isLoading: boolean;
  dialogOpen: boolean;
  setDialogOpen: (v: boolean) => void;
  couponForm: CouponForm;
  setCouponForm: React.Dispatch<React.SetStateAction<CouponForm>>;
  editingCoupon: any;
  openEditCoupon: (coupon: any) => void;
  resetCouponForm: () => void;
  saveCoupon: any;
  toggleCouponStatus: any;
};

export const CouponsTab = ({
  coupons,
  isLoading,
  dialogOpen,
  setDialogOpen,
  couponForm,
  setCouponForm,
  editingCoupon,
  openEditCoupon,
  resetCouponForm,
  saveCoupon,
  toggleCouponStatus,
}: CouponsTabProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cupons ({coupons.length})</CardTitle>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetCouponForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 sm:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    placeholder="EX: VERAO10"
                    value={couponForm.code}
                    onChange={(e) =>
                      setCouponForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={couponForm.type}
                    onValueChange={(v) => setCouponForm((c) => ({ ...c, type: v as "percent" | "amount" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">% (percentual)</SelectItem>
                      <SelectItem value="amount">R$ (valor fixo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={couponForm.value}
                    onChange={(e) => setCouponForm((c) => ({ ...c, value: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pedido mínimo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Opcional"
                    value={couponForm.min_order_value}
                    onChange={(e) => setCouponForm((c) => ({ ...c, min_order_value: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Expira em</Label>
                <Input
                  type="datetime-local"
                  value={couponForm.expires_at}
                  onChange={(e) => setCouponForm((c) => ({ ...c, expires_at: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={couponForm.is_active}
                  onCheckedChange={(v) => setCouponForm((c) => ({ ...c, is_active: v }))}
                />
                <Label>Ativo</Label>
              </div>
              <div className="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur border-t pt-3">
                <Button
                  className="w-full"
                  onClick={() => saveCoupon.mutate(couponForm)}
                  disabled={saveCoupon.isPending || !couponForm.code || !couponForm.value}
                >
                  {saveCoupon.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
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
        ) : coupons.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum cupom cadastrado</p>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon: any) => (
              <div key={coupon.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  <Tag className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium uppercase">{coupon.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {coupon.type === "percent" ? `${coupon.value}%` : `R$ ${Number(coupon.value).toFixed(2)}`}{" "}
                    {coupon.min_order_value ? `• Pedido mínimo: R$ ${Number(coupon.min_order_value).toFixed(2)}` : ""}
                    {coupon.expires_at ? ` • Expira: ${new Date(coupon.expires_at).toLocaleString("pt-BR")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      coupon.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {coupon.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEditCoupon(coupon)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleCouponStatus.mutate({ id: coupon.id, isActive: coupon.is_active })}
                    disabled={toggleCouponStatus.isPending}
                  >
                    {coupon.is_active ? (
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
