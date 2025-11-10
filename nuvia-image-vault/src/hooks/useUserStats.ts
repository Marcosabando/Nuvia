// src/hooks/useUserStats.ts - VERSIÓN ACTUALIZADA
import { useEffect, useState } from "react";
import { apiService } from '@/services/api.services';

interface StatsData {
  totalImages: number;
  todayUploads: number;
  storageUsed: number;
  storageLimit: number;
  storagePercentage: number;
  totalVideos: number;
}

interface UserStats {
  username: string;
  email: string;
  stats: StatsData;
  loading: boolean;
  error: string | null;
}

export const useUserStats = (): UserStats => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<StatsData>({
    totalImages: 0,
    todayUploads: 0,
    storageUsed: 0,
    storageLimit: 50, // 5GB por defecto
    storagePercentage: 0,
    totalVideos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔄 Iniciando petición de perfil de usuario...");

        // ✅ Usar el endpoint /users/profile que ahora incluye todas las estadísticas
        const response = await apiService.get('/users/profile');
        
        console.log("📊 Respuesta de perfil:", response);

        if (response.success && response.data) {
          const userData = response.data;
          
          // Establecer datos del usuario
          setUsername(userData.username || "");
          setEmail(userData.email || "");
          
          // Calcular estadísticas - ahora vienen directamente del backend
          const storageUsedGB = parseFloat((userData.storageUsed / 1024 / 1024 / 1024).toFixed(2));
          const storageLimitGB = parseFloat((userData.storageLimit / 1024 / 1024 / 1024).toFixed(2));

          setStats({
            totalImages: userData.stats?.totalImages || 0,
            todayUploads: userData.stats?.todayUploads || 0, // ✅ Ahora viene del backend
            storageUsed: storageUsedGB,
            storageLimit: storageLimitGB,
            storagePercentage: parseFloat(userData.storagePercentage) || 0,
            totalVideos: userData.stats?.totalVideos || 0, // ✅ Ahora viene del backend
          });

          console.log("✅ Datos de usuario cargados correctamente", {
            totalImages: userData.stats?.totalImages,
            todayUploads: userData.stats?.todayUploads,
            totalVideos: userData.stats?.totalVideos
          });
        } else {
          throw new Error(response.error || 'Error en la respuesta del servidor');
        }

      } catch (err: any) {
        console.error("❌ Error cargando datos del usuario:", err);
        
        // Manejar diferentes tipos de errores
        if (err.response?.data?.error) {
          setError(`Error del servidor: ${err.response.data.error}`);
        } else if (err.message) {
          setError(`Error: ${err.message}`);
        } else {
          setError("No se pudieron cargar los datos del usuario");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return { username, email, stats, loading, error };
};