// src/hooks/useImages.ts - INTERFAZ ACTUALIZADA
import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";

interface ImageData {
  id: number;
  userId: number;
  title: string;
  description?: string; // ✅ AÑADIR ESTA LÍNEA
  originalFilename: string;
  filename: string;
  imagePath: string;
  thumbnailPath?: string;
  mediumPath?: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  isFavorite?: boolean;
  isPublic?: boolean;
  createdAt: string;
  updatedAt?: string;
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
          description: img.description, // ✅ INCLUIR DESCRIPTION
          originalFilename: img.originalFilename,
          filename: img.filename,
          imagePath: img.imagePath,
          thumbnailPath: img.thumbnailPath,
          mediumPath: img.mediumPath,
          fileSize: img.fileSize,
          mimeType: img.mimeType,
          width: img.width,
          height: img.height,
          isFavorite: img.isFavorite,
          isPublic: img.isPublic,
          createdAt: img.createdAt,
          updatedAt: img.updatedAt
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