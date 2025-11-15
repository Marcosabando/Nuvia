// 📂 UBICACIÓN: frontend/src/hooks/useRecent.ts

import { useState, useEffect } from 'react';
import axios from 'axios';

interface RecentItem {
  id: number;
  type: 'image' | 'video';
  name: string;
  title: string;
  path: string;
  thumbnailPath?: string;
  size: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  accessedAt: string;
  dimensions?: string;
  isFavorite: boolean;
}

interface RecentStats {
  lastActivity: string | null;
  mostRecent: {
    name: string;
    type: string;
  } | null;
  counts: {
    today: number;
    week: number;
    month: number;
  };
}

export const useRecent = (timeFilter: 'today' | 'week' | 'month' | 'all' = 'week') => {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [stats, setStats] = useState<RecentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Helper para obtener el token correctamente
  const getAuthToken = (): string | null => {
    // Intentar obtener el token de diferentes fuentes
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('token');
    
    console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
    return token;
  };

  // Obtener items recientes
  const fetchRecentItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      
      if (!token) {
        setError('No hay sesión activa. Por favor, inicia sesión.');
        setLoading(false);
        return;
      }

      console.log('📡 Llamando a /api/recents con token');
      
      const response = await axios.get(`${API_URL}/recents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          timeFilter,
          limit: 20
        }
      });

      console.log('✅ Respuesta recibida:', response.data);

      if (response.data.success) {
        setRecentItems(response.data.data);
      }
    } catch (err: any) {
      console.error('❌ Error fetching recent items:', err);
      
      if (err.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        setError(err.response?.data?.message || 'Error al cargar elementos recientes');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener estadísticas
  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.log('⚠️ No hay token para obtener estadísticas');
        return;
      }

      console.log('📡 Llamando a /api/recents/stats con token');
      
      const response = await axios.get(`${API_URL}/recents/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Estadísticas recibidas:', response.data);

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      console.error('❌ Error fetching stats:', err);
      
      if (err.response?.status === 401) {
        console.log('⚠️ Token inválido o expirado');
      }
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    
    if (token) {
      fetchRecentItems();
      fetchStats();
    } else {
      setError('No hay sesión activa. Por favor, inicia sesión.');
      setLoading(false);
    }
  }, [timeFilter]);

  // Helper: Obtener URL completa del archivo
  const getFileUrl = (path: string): string => {
    // Eliminar /api de la URL base para construir la URL del archivo
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}/${path}`;
  };

  // Helper: Obtener tiempo relativo
  const getRelativeTime = (date: string): string => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
    }
    return past.toLocaleDateString('es-ES');
  };

  return {
    recentItems,
    stats,
    loading,
    error,
    refetch: fetchRecentItems,
    getFileUrl,
    getRelativeTime
  };
};