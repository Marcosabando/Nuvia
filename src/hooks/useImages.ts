// src/hooks/useImages.ts
import { useEffect, useState } from "react";
import { apiService } from "@/services/api.service";

interface ImageData {
  id: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  fileSize: number;
  mimeType: string;
  created: string;
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
        setImages(response.data);
        console.log("✅ Imágenes cargadas correctamente:", response.data.length);
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


