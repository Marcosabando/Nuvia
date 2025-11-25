// src/hooks/useUserStats.ts
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

        const response = await apiService.get('/users/profile');

        if (response.success && response.data) {
          const userData = response.data;

          setUsername(userData.username || "");
          setEmail(userData.email || "");
          setRole(userData.role || "user");

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
        } else {
          throw new Error(response.error || 'Error en la respuesta del servidor');
        }
      } catch (err: any) {
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

  return { username, email, role, stats, loading, error };
};
