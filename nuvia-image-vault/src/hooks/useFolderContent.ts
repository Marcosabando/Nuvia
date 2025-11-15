import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";

interface ImageData {
  imageId: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  thumbnailPath?: string;
  mediumPath?: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  isFavorite: boolean;
  createdAt: string;
  sortOrder: number;
}

interface VideoData {
  videoId: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  videoPath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  isFavorite: boolean;
  createdAt: string;
  sortOrder: number;
}

interface FolderInfo {
  folderId: number;
  userId: number;
  name: string;
  description?: string;
  color: string;
  isSystem: boolean;
  itemCount: number;
  createdAt: string;
}

interface FolderContentData {
  folder: FolderInfo;
  images: ImageData[];
  videos: VideoData[];
  totalItems: number;
}

interface UseFolderContentReturn {
  content: FolderContentData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  removeImage: (imageId: number) => Promise<void>;
  removeVideo: (videoId: number) => Promise<void>;
}

export const useFolderContent = (folderId: string | undefined): UseFolderContentReturn => {
  const [content, setContent] = useState<FolderContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = async () => {
    if (!folderId) {
      setError("ID de carpeta no válido");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 Obteniendo contenido de carpeta ${folderId}...`);
      
      const response = await apiService.get(`/folders/${folderId}/content`);
      
      console.log("📁 Respuesta de contenido:", response);
      
      if (response.success && response.data) {
        setContent(response.data);
        console.log("✅ Contenido cargado:", response.data);
      } else {
        throw new Error(response.error || 'Error al cargar el contenido');
      }
    } catch (err: any) {
      console.error("❌ Error cargando contenido:", err);
      
      if (err.response?.status === 404) {
        setError("Carpeta no encontrada");
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("No se pudo cargar el contenido de la carpeta");
      }
    } finally {
      setLoading(false);
    }
  };

  const removeImage = async (imageId: number) => {
    if (!folderId) return;

    try {
      console.log(`🗑️ Eliminando imagen ${imageId} de carpeta ${folderId}`);
      
      const response = await apiService.delete(`/folders/${folderId}/images/${imageId}`);
      
      if (response.success) {
        console.log("✅ Imagen eliminada de la carpeta");
        await fetchContent(); // Refrescar contenido
      } else {
        throw new Error(response.error || 'Error al eliminar imagen');
      }
    } catch (err: any) {
      console.error("❌ Error eliminando imagen:", err);
      throw err;
    }
  };

  const removeVideo = async (videoId: number) => {
    if (!folderId) return;

    try {
      console.log(`🗑️ Eliminando video ${videoId} de carpeta ${folderId}`);
      
      const response = await apiService.delete(`/folders/${folderId}/videos/${videoId}`);
      
      if (response.success) {
        console.log("✅ Video eliminado de la carpeta");
        await fetchContent(); // Refrescar contenido
      } else {
        throw new Error(response.error || 'Error al eliminar video');
      }
    } catch (err: any) {
      console.error("❌ Error eliminando video:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchContent();
  }, [folderId]);

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    removeImage,
    removeVideo,
  };
};