// src/hooks/useFolders.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { apiService } from "@/services/api.services";

export interface Folder {
  id: number;
  name: string;
  description?: string;
  color: string;
  isSystem: boolean;
  itemCount: number;
  createdAt: string;
}

interface UseFoldersReturn {
  systemFolders: Folder[];
  userFolders: Folder[];
  loading: boolean;
  error: string | null;
  createFolder: (data: any) => Promise<void>;
  deleteFolder: (folderId: number) => Promise<void>;
  updateFolder: (folderId: number, data: { name: string; description?: string }) => Promise<void>; // ✅ AÑADIDO
  refreshFolders: () => Promise<void>;
  // ✅ útil si quieres update manual sin eventos
  applyItemDelta: (folderId: number, delta: number) => void;
}

type ItemDeltaDetail = { folderId: number; delta: number };

export const useFolders = (): UseFoldersReturn => {
  const [systemFolders, setSystemFolders] = useState<Folder[]>([]);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ evita spamear refetch
  const refreshTimer = useRef<number | null>(null);

  const normalizeFolders = (data: any[]): Folder[] => {
    return data.map((item: any) => {
      const id = item.id ?? item.folderId;
      if (id == null) throw new Error("Folder sin id (id/folderId) en la respuesta del API");

      return {
        id: Number(id),
        name: item.name ?? "Sin nombre",
        description: item.description,
        color: item.color || "#6B7280",
        isSystem: Boolean(item.isSystem),
        itemCount: Number(item.itemCount ?? 0),
        createdAt: item.createdAt || new Date().toISOString(),
      };
    });
  };

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ cache-busting por si tu apiService/browser cachea
      const response = await apiService.get(`/folders?ts=${Date.now()}`);

      if (!response?.success || !response?.data) {
        throw new Error(response?.error || "Respuesta inválida del servidor");
      }

      const folders = normalizeFolders(response.data);
      setSystemFolders(folders.filter((f) => f.isSystem));
      setUserFolders(folders.filter((f) => !f.isSystem));
    } catch (e: any) {
      console.error("❌ Error cargando carpetas:", e);
      setSystemFolders([]);
      setUserFolders([]);
      setError(e?.message || "No se pudieron cargar las carpetas");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ actualiza contador local sin backend
  const applyItemDelta = useCallback((folderId: number, delta: number) => {
    const update = (list: Folder[]) =>
      list.map((f) =>
        f.id === folderId ? { ...f, itemCount: Math.max(0, (f.itemCount || 0) + delta) } : f
      );

    setSystemFolders((prev) => update(prev));
    setUserFolders((prev) => update(prev));
  }, []);

  const refreshFolders = useCallback(async () => {
    // ✅ debounce: si llaman 10 veces, hace 1 sola petición
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);

    refreshTimer.current = window.setTimeout(() => {
      fetchFolders();
      refreshTimer.current = null;
    }, 400);
  }, [fetchFolders]);

  const createFolder = async (data: any) => {
    const response = await apiService.post("/folders", data);
    if (!response?.success) throw new Error(response?.error || "Error creating folder");
    await fetchFolders();
  };

  const deleteFolder = async (folderId: number) => {
    const response = await apiService.delete(`/folders/${folderId}`);
    if (!response?.success) throw new Error(response?.error || "Error deleting folder");
    await fetchFolders();
  };

  // ✅ UPDATE FOLDER (PATCH)
  const updateFolder = async (folderId: number, data: { name: string; description?: string }) => {
    const response = await apiService.patch(`/folders/${folderId}`, data);
    if (!response?.success) throw new Error(response?.error || "Error updating folder");
    await fetchFolders();
  };

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // ✅ escucha evento para sumar/restar SIN refetch
  useEffect(() => {
    const onDelta = (ev: Event) => {
      const e = ev as CustomEvent<ItemDeltaDetail>;
      if (!e.detail) return;
      applyItemDelta(e.detail.folderId, e.detail.delta);
    };

    window.addEventListener("folders:itemDelta", onDelta as EventListener);
    return () => window.removeEventListener("folders:itemDelta", onDelta as EventListener);
  }, [applyItemDelta]);

  // ✅ escucha refresh (por si quieres “verificación” sin spamear)
  useEffect(() => {
    const onRefresh = () => {
      void refreshFolders();
    };
    window.addEventListener("folders:refresh", onRefresh);
    return () => window.removeEventListener("folders:refresh", onRefresh);
  }, [refreshFolders]);

  return {
    systemFolders,
    userFolders,
    loading,
    error,
    createFolder,
    deleteFolder,
    updateFolder,
    refreshFolders,
    applyItemDelta,
  };
};
