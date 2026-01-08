// 📂 UBICACIÓN: frontend/src/hooks/useRecent.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

// ✅ AÑADIR 'document' al tipo
interface RecentItem {
  id: number;
  type: 'image' | 'video' | 'document';
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
  // ✅ Propiedades adicionales para documentos
  category?: string;
  extension?: string;
  pageCount?: number;
  author?: string;
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

  // Obtener token
  const getAuthToken = (): string | null => {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token')
    );
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

      const response = await axios.get(`${API_URL}/recents`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          timeFilter,
          limit: 20
        }
      });

      if (response.data.success) {
        // ✅ Asegurar que los documentos tengan tipo 'document'
        const items = response.data.data.map((item: any) => {
          // Si es un documento, asegurar que el tipo sea 'document'
          if (item.mimeType && (
            item.mimeType.includes('pdf') ||
            item.mimeType.includes('document') ||
            item.mimeType.includes('word') ||
            item.mimeType.includes('excel') ||
            item.mimeType.includes('powerpoint') ||
            item.mimeType.includes('text/') ||
            item.mimeType.includes('application/')
          )) {
            return {
              ...item,
              type: 'document',
              extension: item.name?.split('.').pop()?.toLowerCase() || 
                       item.originalFilename?.split('.').pop()?.toLowerCase()
            };
          }
          return item;
        });
        
        setRecentItems(items);
      }
    } catch (err: any) {
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
      if (!token) return;

      const response = await axios.get(`${API_URL}/recents/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch {
      // Silenciado porque las estadísticas no son críticas
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

  // ✅ Nueva función: Obtener icono según tipo de archivo
  const getFileIcon = (type: string, mimeType?: string, extension?: string): string => {
    if (type === 'image') return '🖼️';
    if (type === 'video') return '🎬';
    
    // Iconos específicos para documentos
    if (mimeType?.includes('pdf')) return '📕';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📄';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📑';
    if (mimeType?.includes('text/')) return '📝';
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('7z')) return '📦';
    if (extension === 'pdf') return '📕';
    if (['doc', 'docx'].includes(extension || '')) return '📄';
    if (['xls', 'xlsx'].includes(extension || '')) return '📊';
    if (['ppt', 'pptx'].includes(extension || '')) return '📑';
    if (['txt', 'md', 'rtf'].includes(extension || '')) return '📝';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return '📦';
    
    return '📁';
  };

  // ✅ Nueva función: Obtener nombre del tipo de archivo
  const getFileTypeName = (type: string, mimeType?: string): string => {
    if (type === 'image') return 'Imagen';
    if (type === 'video') return 'Video';
    
    if (mimeType?.includes('pdf')) return 'PDF';
    if (mimeType?.includes('word')) return 'Documento Word';
    if (mimeType?.includes('excel')) return 'Hoja de cálculo';
    if (mimeType?.includes('powerpoint')) return 'Presentación';
    if (mimeType?.includes('text/')) return 'Texto';
    if (mimeType?.includes('zip')) return 'Archivo comprimido';
    
    return 'Documento';
  };

  return {
    recentItems,
    stats,
    loading,
    error,
    refetch: fetchRecentItems,
    getFileUrl,
    getRelativeTime,
    getFileIcon,
    getFileTypeName
  };
};