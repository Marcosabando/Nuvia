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
  updateFolder: (folderId: number, data: { name: string; description?: string }) => Promise<void>;
  refreshFolders: () => Promise<void>;
}

let isFetching = false;
let lastFetchTime = 0;

export const useFolders = (): UseFoldersReturn => {
  const [systemFolders, setSystemFolders] = useState<Folder[]>([]);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const normalizeFolders = (data: any[]): Folder[] => {
    return data.map((item: any) => {
      const id = item.id ?? item.folderId;
      if (id == null) {
        console.warn("Folder sin id en la respuesta:", item);
        return null;
      }

      return {
        id: Number(id),
        name: item.name ?? "Sin nombre",
        description: item.description,
        color: item.color || "#6B7280",
        isSystem: Boolean(item.isSystem),
        itemCount: Number(item.itemCount ?? 0),
        createdAt: item.createdAt || new Date().toISOString(),
      };
    }).filter(Boolean) as Folder[];
  };

  const fetchFolders = useCallback(async () => {
    const now = Date.now();
    
    if (isFetching || (now - lastFetchTime < 1000)) {
      return;
    }

    isFetching = true;
    lastFetchTime = now;

    if (!isMounted.current) {
      isFetching = false;
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(`/folders?ts=${Date.now()}`);

      if (!response?.success || !response?.data) {
        throw new Error(response?.error || "Respuesta inválida del servidor");
      }

      const folders = normalizeFolders(response.data);
      
      if (isMounted.current) {
        setSystemFolders(folders.filter((f) => f.isSystem));
        setUserFolders(folders.filter((f) => !f.isSystem));
      }
    } catch (e: any) {
      console.error("Error cargando carpetas:", e);
      if (isMounted.current) {
        setSystemFolders([]);
        setUserFolders([]);
        setError(e?.message || "No se pudieron cargar las carpetas");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      isFetching = false;
    }
  }, []);

  const refreshFolders = useCallback(async () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setTimeout(() => {
      fetchFolders();
    }, 300);
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

  const updateFolder = async (folderId: number, data: { name: string; description?: string }) => {
    const response = await apiService.patch(`/folders/${folderId}`, data);
    if (!response?.success) throw new Error(response?.error || "Error updating folder");
    await fetchFolders();
  };

  useEffect(() => {
    isMounted.current = true;
    fetchFolders();

    const handleRefresh = () => {
      refreshFolders();
    };

    window.addEventListener("folders:refresh", handleRefresh);

    return () => {
      isMounted.current = false;
      window.removeEventListener("folders:refresh", handleRefresh);
      
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [fetchFolders, refreshFolders]);

  return {
    systemFolders,
    userFolders,
    loading,
    error,
    createFolder,
    deleteFolder,
    updateFolder,
    refreshFolders,
  };
};