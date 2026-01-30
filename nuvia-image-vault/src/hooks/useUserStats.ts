import { useEffect, useState, useCallback } from "react";
import { apiService } from "@/services/api.services";

interface UserStats {
  username: string;
  totalImages: number;
  totalVideos: number;
  totalDocuments: number;
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
  refetch: () => Promise<void>;
}

let statsCache: UserStats | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000;

const toMadridDate = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));

const isTodayMadrid = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const nowMadrid = toMadridDate(new Date());
  const dMadrid = toMadridDate(d);

  return (
    dMadrid.getFullYear() === nowMadrid.getFullYear() &&
    dMadrid.getMonth() === nowMadrid.getMonth() &&
    dMadrid.getDate() === nowMadrid.getDate()
  );
};

const pickCreatedDate = (item: any): string | undefined => {
  return item?.createdAt || item?.uploadedAt || item?.created_at || item?.uploadDate || item?.date;
};

const normalizeList = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

export const useUserStats = (): UseUserStatsReturn => {
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState<UserStats>({
    username: "",
    totalImages: 0,
    totalVideos: 0,
    totalDocuments: 0,
    todayUploads: 0,
    storageUsed: 0,
    storageLimit: 0,
    storagePercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayUploadsFromLists = useCallback(async (): Promise<number | null> => {
    try {
      let todayCount = 0;
      const endpoints = ['/images', '/videos', '/documents'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await apiService.get(endpoint);
          
          if (response.success) {
            const items = normalizeList(response.data);
            const count = items.filter((x) => isTodayMadrid(pickCreatedDate(x))).length;
            todayCount += count;
          }
          
          if (endpoint !== endpoints[endpoints.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.warn(`⚠️ No se pudo obtener ${endpoint}:`, err);
        }
      }
      
      return todayCount;
      
    } catch (error) {
      console.error('❌ Error calculando subidas de hoy:', error);
      return null;
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = Date.now();
      if (statsCache && (now - lastFetchTime) < CACHE_DURATION) {
        setUsername(statsCache.username);
        setStats(statsCache);
        setLoading(false);
        return;
      }

      const statsResponse = await apiService.get("/profile/stats");

      if (!statsResponse.success || !statsResponse.data) {
        throw new Error(statsResponse.error || "Error en la respuesta del servidor");
      }

      const userData = statsResponse.data;
      let todayUploadsFinal = userData.todayUploads || 0;
      
      if (!userData.todayUploads) {
        const computedToday = await fetchTodayUploadsFromLists();
        if (computedToday !== null) {
          todayUploadsFinal = computedToday;
        }
      }

      const newStats: UserStats = {
        username: userData.username || "",
        totalImages: userData.imageCount || 0,
        totalVideos: userData.videoCount || 0,
        totalDocuments: userData.documentCount || 0,
        todayUploads: todayUploadsFinal,
        storageUsed: Math.round(((userData.storageUsed || 0) / (1024 * 1024 * 1024)) * 100) / 100,
        storageLimit: Math.round(((userData.storageLimit || 5368709120) / (1024 * 1024 * 1024)) * 100) / 100,
        storagePercentage: userData.storagePercentage || 0,
      };

      statsCache = newStats;
      lastFetchTime = Date.now();

      setUsername(userData.username || "");
      setStats(newStats);
      
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError("Demasiadas peticiones. Por favor, espera unos momentos antes de intentar nuevamente.");
      } else if (err.response?.data?.error) {
        setError(`Error del servidor: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError("No se pudieron cargar las estadísticas");
      }
      
      if (statsCache) {
        setUsername(statsCache.username);
        setStats(statsCache);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchTodayUploadsFromLists]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  return {
    username,
    stats,
    loading,
    error,
    refetch: fetchUserStats,
  };
};