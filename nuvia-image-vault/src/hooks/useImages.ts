// hooks/useImages.ts
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.services';

interface ImageItem {
  id: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  fileSize: number;
  mimeType: string;
  created: string;
  isFavorite?: boolean;
  deletedAt?: string | null;
}

export function useImages() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/images');
      setImages(response.data || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar las imágenes');
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (imageId: number) => {
    try {
      await apiService.post(`/images/${imageId}/favorite`);
      // Actualizar el estado local
      setImages(prevImages => 
        prevImages.map(image => 
          image.id === imageId 
            ? { ...image, isFavorite: !image.isFavorite }
            : image
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  };

  const deleteImagePermanently = async (imageId: number) => {
    try {
      await apiService.delete(`/images/${imageId}/permanent`);  
      setImages(prevImages => 
        prevImages.filter(image => image.id !== imageId)
      );
    } catch (error) {
      console.error('Error deleting image permanently:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al eliminar la imagen permanentemente';
      throw new Error(errorMessage);
    }
  };

  

  useEffect(() => {
    fetchImages();
  }, []);

  return {
    images,
    loading,
    error,
    refetch: fetchImages,
    toggleFavorite,
    deleteImagePermanently,
    
  };
}