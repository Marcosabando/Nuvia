// src/hooks/useUserStats.ts - VERSIÓN ACTUALIZADA
import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";

interface UserStats {
  username: string;
  totalImages: number;
  totalVideos: number;
  totalDocuments: number; // ✅ NUEVA PROPIEDAD
  todayUploads: number;
  storageUsed: number;
  storageLimit: number;
  storagePercentage: number;
}

interface UseUserStatsReturn {
  username: string;
  stats: UserStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useUserStats = (): UseUserStatsReturn => {
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState<UserStats>({
    username: "",
    totalImages: 0,
    totalVideos: 0,
    totalDocuments: 0, // ✅ INICIALIZAR
    todayUploads: 0,
    storageUsed: 0,
    storageLimit: 0,
    storagePercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener estadísticas del usuario
      const statsResponse = await apiService.get('/profile/stats');

      if (statsResponse.success && statsResponse.data) {
        const userData = statsResponse.data;
        
        setUsername(userData.username || "");
        
        setStats({
          username: userData.username || "",
          totalImages: userData.imageCount || 0,
          totalVideos: userData.videoCount || 0,
          totalDocuments: userData.documentCount || 0, // ✅ INCLUIR DOCUMENTOS
          todayUploads: userData.todayUploads || 0,
          storageUsed: Math.round((userData.storageUsed || 0) / (1024 * 1024 * 1024) * 100) / 100, // Convertir a GB
          storageLimit: Math.round((userData.storageLimit || 5368709120) / (1024 * 1024 * 1024) * 100) / 100, // 5GB por defecto
          storagePercentage: userData.storagePercentage || 0,
        });

      } else {
        throw new Error(statsResponse.error || 'Error en la respuesta del servidor');
      }

    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(`Error del servidor: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError("No se pudieron cargar las estadísticas");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  return {
    username,
    stats,
    loading,
    error,
    refetch: fetchUserStats
  };
};