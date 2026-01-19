// src/hooks/useUserStats.ts - CORREGIDO (todayUploads calculado en frontend con Europe/Madrid)
import { useEffect, useState } from "react";
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
  refetch: () => Promise<void>; // ✅ ahora devuelve Promise para poder await
}

/** Convierte cualquier Date a “fecha/hora” Europe/Madrid */
const toMadridDate = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));

/** Devuelve true si dateStr cae “hoy” en Europe/Madrid */
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

/** Intenta sacar fecha de creación con varios nombres típicos */
const pickCreatedDate = (item: any): string | undefined => {
  return item?.createdAt || item?.uploadedAt || item?.created_at || item?.uploadDate || item?.date;
};

/** Normaliza respuestas tipo {data: []} o [] */
const normalizeList = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.results)) return res.results;
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

  /**
   * ✅ Endpoints típicos para listar archivos.
   * Ajusta/añade aquí los reales de tu backend si son distintos.
   */
  const LIST_ENDPOINTS = {
    images: ["/images", "/media/images", "/files/images", "/uploads/images"],
    videos: ["/videos", "/media/videos", "/files/videos", "/uploads/videos"],
    documents: ["/documents", "/media/documents", "/files/documents", "/uploads/documents"],
    all: ["/files", "/media", "/uploads"],
  };

  const fetchTodayUploadsFromLists = async (): Promise<number | null> => {
    // 1) primero intentamos un endpoint “all” si existe
    for (const url of LIST_ENDPOINTS.all) {
      const r = await apiService.get(url).catch(() => null);
      if (r?.success && r?.data) {
        const all = normalizeList(r.data);
        return all.filter((x) => isTodayMadrid(pickCreatedDate(x))).length;
      }
    }

    // 2) si no hay “all”, intentamos por separado
    const [imgRes, vidRes, docRes] = await Promise.allSettled([
      (async () => {
        for (const url of LIST_ENDPOINTS.images) {
          const r = await apiService.get(url).catch(() => null);
          if (r?.success && r?.data) return normalizeList(r.data);
        }
        return [];
      })(),
      (async () => {
        for (const url of LIST_ENDPOINTS.videos) {
          const r = await apiService.get(url).catch(() => null);
          if (r?.success && r?.data) return normalizeList(r.data);
        }
        return [];
      })(),
      (async () => {
        for (const url of LIST_ENDPOINTS.documents) {
          const r = await apiService.get(url).catch(() => null);
          if (r?.success && r?.data) return normalizeList(r.data);
        }
        return [];
      })(),
    ]);

    const images = imgRes.status === "fulfilled" ? imgRes.value : [];
    const videos = vidRes.status === "fulfilled" ? vidRes.value : [];
    const documents = docRes.status === "fulfilled" ? docRes.value : [];

    const combined = [...images, ...videos, ...documents];
    if (combined.length === 0) return null; // no tenemos endpoints válidos
    return combined.filter((x) => isTodayMadrid(pickCreatedDate(x))).length;
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) stats del backend (totales, storage, etc.)
      const statsResponse = await apiService.get("/profile/stats");

      if (!statsResponse.success || !statsResponse.data) {
        throw new Error(statsResponse.error || "Error en la respuesta del servidor");
      }

      const userData = statsResponse.data;

      // 2) Recalcular todayUploads en frontend (Madrid) si podemos
      const computedToday = await fetchTodayUploadsFromLists();

      const todayUploadsFinal =
        computedToday !== null
          ? computedToday // ✅ lo calculado manda
          : (userData.todayUploads || 0); // fallback al backend

      setUsername(userData.username || "");

      setStats({
        username: userData.username || "",
        totalImages: userData.imageCount || 0,
        totalVideos: userData.videoCount || 0,
        totalDocuments: userData.documentCount || 0,
        todayUploads: todayUploadsFinal,
        storageUsed: Math.round(((userData.storageUsed || 0) / (1024 * 1024 * 1024)) * 100) / 100,
        storageLimit:
          Math.round(((userData.storageLimit || 5368709120) / (1024 * 1024 * 1024)) * 100) / 100,
        storagePercentage: userData.storagePercentage || 0,
      });
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
    refetch: fetchUserStats, // ✅ ya es async
  };
};
