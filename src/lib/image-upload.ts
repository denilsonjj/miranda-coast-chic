import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET_NAME = 'products';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadImageToSupabase = async (
  file: File,
  folder: string = 'products'
): Promise<string | null> => {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem');
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('O arquivo é muito grande. Máximo 5MB');
      return null;
    }

    // Create unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}-${random}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da imagem: ' + error.message);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error: any) {
    console.error('Upload exception:', error);
    toast.error('Erro ao fazer upload: ' + error.message);
    return null;
  }
};

export const deleteImageFromSupabase = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract path from public URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/products/path/to/file
    const urlParts = imageUrl.split('/');
    const pathIndex = urlParts.indexOf('products');
    
    if (pathIndex === -1) {
      console.warn('Could not extract path from URL:', imageUrl);
      return false;
    }

    const filePath = urlParts.slice(pathIndex).join('/');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao deletar imagem: ' + error.message);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Delete exception:', error);
    toast.error('Erro ao deletar imagem: ' + error.message);
    return false;
  }
};
