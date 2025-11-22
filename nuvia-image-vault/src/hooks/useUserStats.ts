// src/hooks/useUserStats.ts - VERSIÓN CON LOGS DE DEBUGGING
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
  role: "user" | "admin" | "moderator";
  stats: StatsData;
  loading: boolean;
  error: string | null;
}

export const useUserStats = (): UserStats => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin" | "moderator">("user");
  const [stats, setStats] = useState<StatsData>({
    totalImages: 0,
    todayUploads: 0,
    storageUsed: 0,
    storageLimit: 50,
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

        console.log("🔄 [useUserStats] Iniciando petición de perfil...");

        const response = await apiService.get('/users/profile');
        
        console.log("📦 [useUserStats] Respuesta RAW completa:", response);
        console.log("📊 [useUserStats] response.data:", response.data);
        console.log("👤 [useUserStats] response.data.role:", response.data?.role);
        console.log("🔍 [useUserStats] Tipo de role:", typeof response.data?.role);
        
        if (response.success && response.data) {
          const userData = response.data;
          
          console.log("✅ [useUserStats] userData completo:", userData);
          console.log("✅ [useUserStats] userData.role:", userData.role);
          
          // Extraer los datos
          const extractedUsername = userData.username || "";
          const extractedEmail = userData.email || "";
          const extractedRole = userData.role || "user";
          
          console.log("📤 [useUserStats] Valores extraídos:", {
            username: extractedUsername,
            email: extractedEmail,
            role: extractedRole,
            roleType: typeof extractedRole
          });
          
          setUsername(extractedUsername);
          setEmail(extractedEmail);
          setRole(extractedRole);
          
          // Calcular estadísticas
          const storageUsedGB = parseFloat((userData.storageUsed / 1024 / 1024 / 1024).toFixed(2));
          const storageLimitGB = parseFloat((userData.storageLimit / 1024 / 1024 / 1024).toFixed(2));
          
          setStats({
            totalImages: userData.stats?.totalImages || 0,
            todayUploads: userData.stats?.todayUploads || 0,
            storageUsed: storageUsedGB,
            storageLimit: storageLimitGB,
            storagePercentage: parseFloat(userData.storagePercentage) || 0,
            totalVideos: userData.stats?.totalVideos || 0,
          });
          
          console.log("✅ [useUserStats] Estado actualizado. Role final:", extractedRole);
        } else {
          throw new Error(response.error || 'Error en la respuesta del servidor');
        }

      } catch (err: any) {
        console.error("❌ [useUserStats] Error cargando datos:", err);
        
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

  // 🔍 Log final del estado retornado
  console.log("🎯 [useUserStats] Estado retornado:", { username, email, role });

  return { username, email, role, stats, loading, error };
};