// src/hooks/useImages.ts - VERSIÓN MEJORADA
import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";

interface ImageData {
  id: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  thumbnailPath?: string;  // ✅ AÑADIR
  mediumPath?: string;      // ✅ AÑADIR
  fileSize: number;
  mimeType: string;
  created: string;
  isFavorite?: boolean;
}

interface UseImagesReturn {
  images: ImageData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useImages = (): UseImagesReturn => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Obteniendo imágenes del usuario...");
      
      const response = await apiService.get('/images');
      
      console.log("📸 Respuesta de imágenes:", response);

      if (response.success && response.data) {
        const transformedImages = response.data.map((img: any) => ({
          id: img.imageId,
          userId: img.userId,
          title: img.title,
          originalFilename: img.originalFilename,
          filename: img.filename,
          imagePath: img.imagePath,
          thumbnailPath: img.thumbnailPath,  // ✅ INCLUIR
          mediumPath: img.mediumPath,        // ✅ INCLUIR
          fileSize: img.fileSize,
          mimeType: img.mimeType,
          created: img.createdAt,
          isFavorite: img.isFavorite
        }));

        setImages(transformedImages);
        console.log("✅ Imágenes transformadas:", transformedImages);
      } else {
        throw new Error(response.error || 'Error en la respuesta del servidor');
      }

    } catch (err: any) {
      console.error("❌ Error cargando imágenes:", err);
      
      if (err.response?.data?.error) {
        setError(`Error del servidor: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError("No se pudieron cargar las imágenes");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return {
    images,
    loading,
    error,
    refetch: fetchImages
  };
};