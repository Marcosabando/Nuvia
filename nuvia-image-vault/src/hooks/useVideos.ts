// src/hooks/useVideos.ts - Versión con paginación
import { useState, useEffect } from 'react';
import { videoApi, Video } from '@/services/videoApi';

export const useVideos = (page = 1, limit = 20, favoritesOnly = false) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await videoApi.getUserVideos(page, limit, favoritesOnly);
      
      if (response.success) {
        setVideos(response.data);
        setPagination(response.pagination);
      } else {
        setError('Error al cargar los videos');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [page, limit, favoritesOnly]);

  return { 
    videos, 
    loading, 
    error, 
    pagination, // ✅ Incluye paginación
    refetch: fetchVideos 
  };
};