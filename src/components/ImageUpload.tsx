import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadImageToSupabase } from '@/lib/image-upload';
import { Loader2, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  label: string;
  onImageUpload: (url: string) => void;
  currentImage?: string;
  onRemoveImage?: () => void;
  folder?: string;
  helperText?: string;
}

export const ImageUpload = ({
  label,
  onImageUpload,
  currentImage,
  onRemoveImage,
  folder = 'products',
  helperText,
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImageToSupabase(file, folder);
      if (url) {
        onImageUpload(url);
        toast.success('Imagem enviada com sucesso!');
      }
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-2 border-dashed border-border rounded-lg p-4">
        {currentImage ? (
          <div className="space-y-2">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={currentImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-muted-foreground break-all">{currentImage}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Trocar Imagem
                  </>
                )}
              </Button>
              {onRemoveImage && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onRemoveImage}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {isUploading ? 'Enviando...' : 'Clique para enviar uma imagem'}
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
          </div>
        )}
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};
