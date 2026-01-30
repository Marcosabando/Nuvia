import { useEffect, useState, useCallback, useRef } from "react";
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
  const isMounted = useRef(true);

  const fetchContent = useCallback(async () => {
    if (!folderId) {
      setError("ID de carpeta no válido");
      setLoading(false);
      return;
    }

    if (!isMounted.current) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(`/folders/${folderId}/content`);

      if (response.success && response.data) {
        if (isMounted.current) {
          setContent(response.data);
        }
      } else {
        throw new Error(response.error || "Error al cargar el contenido");
      }
    } catch (err: any) {
      if (isMounted.current) {
        if (err.response?.status === 404) {
          setError("Carpeta no encontrada");
        } else if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else if (err.message) {
          setError(err.message);
        } else {
          setError("No se pudo cargar el contenido de la carpeta");
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [folderId]);

  const removeImage = async (imageId: number) => {
    if (!folderId || !content) return;

    try {
      // Primero llama a la API
      const response = await apiService.delete(`/folders/${folderId}/images/${imageId}`);

      if (response.success) {
        const updatedImages = content.images.filter(img => img.imageId !== imageId);
        setContent({
          ...content,
          images: updatedImages,
          totalItems: content.totalItems - 1,
          folder: {
            ...content.folder,
            itemCount: Math.max(0, content.folder.itemCount - 1)
          }
        });

        // ✅ ELIMINADO: Ya no disparamos folders:refresh aquí
        // Esto causaba que se hiciera un GET innecesario al backend
        // El FolderView ya maneja la actualización optimista con eventos delta
      } else {
        throw new Error(response.error || "Error al eliminar imagen");
      }
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
      await fetchContent();
      throw error;
    }
  };

  const removeVideo = async (videoId: number) => {
    if (!folderId || !content) return;

    try {
      const response = await apiService.delete(`/folders/${folderId}/videos/${videoId}`);

      if (response.success) {
        const updatedVideos = content.videos.filter(vid => vid.videoId !== videoId);
        setContent({
          ...content,
          videos: updatedVideos,
          totalItems: content.totalItems - 1,
          folder: {
            ...content.folder,
            itemCount: Math.max(0, content.folder.itemCount - 1)
          }
        });

        // ✅ ELIMINADO: Ya no disparamos folders:refresh aquí
        // El FolderView ya maneja la actualización optimista con eventos delta
      } else {
        throw new Error(response.error || "Error al eliminar video");
      }
    } catch (error) {
      console.error("Error al eliminar video:", error);
      await fetchContent();
      throw error;
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchContent();

    return () => {
      isMounted.current = false;
    };
  }, [fetchContent]);

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    removeImage,
    removeVideo,
  };
};