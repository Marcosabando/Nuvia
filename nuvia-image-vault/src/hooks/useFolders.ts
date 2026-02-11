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

// ✅ Cache global para evitar múltiples llamadas
let globalFoldersCache: Folder[] | null = null;
let isFetchingGlobal = false;
let lastFetchTimeGlobal = 0;
const CACHE_DURATION = 60000; // 60 segundos

export const useFolders = (): UseFoldersReturn => {
  const [systemFolders, setSystemFolders] = useState<Folder[]>([]);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const fetchCount = useRef(0);
  
  // ✅ CORREGIDO: Usar el tipo correcto para setTimeout en navegador
  const refreshTimerRef = useRef<number | null>(null);

  const normalizeFolders = (data: any[]): Folder[] => {
    return data.map((item: any) => {
      const id = item.id ?? item.folderId;
      if (id == null) {
        console.warn("Folder sin id en la respuesta:", item);
        return null as any;
      }

      return {
        id: Number(id),
        name: item.name ?? "Sin nombre",
        description: item.description,
        color: item.color || "#6B7280",
        isSystem: Boolean(item.isSystem || item.is_system || false),
        itemCount: Number(item.itemCount ?? item.item_count ?? 0),
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      };
    }).filter(Boolean) as Folder[];
  };

  const fetchFolders = useCallback(async (forceRefresh = false) => {
    // ✅ Prevenir múltiples llamadas simultáneas
    if (isFetchingGlobal) {
      console.log('⏸️ [useFolders] Ya hay una llamada en curso, ignorando...');
      return;
    }

    const requestId = ++fetchCount.current;

    // ✅ Verificar cache
    const now = Date.now();
    const shouldUseCache = !forceRefresh && 
      globalFoldersCache && 
      (now - lastFetchTimeGlobal) < CACHE_DURATION;

    if (shouldUseCache) {
      if (isMounted.current) {
        const cached = globalFoldersCache!;
        setSystemFolders(cached.filter((f) => f.isSystem));
        setUserFolders(cached.filter((f) => !f.isSystem));
        setLoading(false);
      }
      return;
    }

    isFetchingGlobal = true;
    
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      // Agregar timestamp para evitar cache del navegador
      const timestamp = Date.now();
      const response = await apiService.get(`/folders?ts=${timestamp}`);

      if (!response?.success) {
        throw new Error(response?.error || "Respuesta inválida del servidor");
      }

      const folders = normalizeFolders(response.data || []);
      
      // ✅ Actualizar cache global
      globalFoldersCache = folders;
      lastFetchTimeGlobal = now;
      
      if (isMounted.current) {
        setSystemFolders(folders.filter((f) => f.isSystem));
        setUserFolders(folders.filter((f) => !f.isSystem));
      }
    } catch (e: any) {
      console.error(`❌ [useFolders #${requestId}] Error cargando carpetas:`, e);
      if (isMounted.current) {
        setError(e?.message || "No se pudieron cargar las carpetas");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      isFetchingGlobal = false;
    }
  }, []);

  const refreshFolders = useCallback(async () => {
    // ✅ Limpiar timer anterior si existe
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // ✅ Usar debouncing para evitar múltiples refrescos
    refreshTimerRef.current = window.setTimeout(() => {
      fetchFolders(true); // Force refresh
    }, 300);
  }, [fetchFolders]);

  const createFolder = async (data: any) => {
    try {
      console.log('📁 [useFolders] Creando carpeta:', data);
      const response = await apiService.post("/folders", data);
      if (!response?.success) throw new Error(response?.error || "Error creating folder");
      
      // ✅ Invalidar cache y refrescar
      globalFoldersCache = null;
      await refreshFolders();
    } catch (error) {
      console.error('❌ [useFolders] Error creando carpeta:', error);
      throw error;
    }
  };

  const deleteFolder = async (folderId: number) => {
    try {
      console.log(`🗑️ [useFolders] Eliminando carpeta ID: ${folderId}`);
      const response = await apiService.delete(`/folders/${folderId}`);
      if (!response?.success) throw new Error(response?.error || "Error deleting folder");
      
      // ✅ Invalidar cache y refrescar
      globalFoldersCache = null;
      await refreshFolders();
    } catch (error: any) {
      console.error('❌ [useFolders] Error eliminando carpeta:', error);
      throw error;
    }
  };

  const updateFolder = async (folderId: number, data: { name: string; description?: string }) => {
    try {
      console.log(`✏️ [useFolders] Actualizando carpeta ID: ${folderId}`, data);
      const response = await apiService.patch(`/folders/${folderId}`, data);
      if (!response?.success) throw new Error(response?.error || "Error updating folder");
      
      // ✅ Invalidar cache y refrescar
      globalFoldersCache = null;
      await refreshFolders();
    } catch (error) {
      console.error('❌ [useFolders] Error actualizando carpeta:', error);
      throw error;
    }
  };

  // ✅ useEffect se ejecuta solo una vez al montar
  useEffect(() => {
    isMounted.current = true;
    
    // Pequeño delay para evitar llamadas simultáneas con otros hooks
    const timer = window.setTimeout(() => {
      fetchFolders();
    }, 150);
    
    const handleRefresh = () => {
      refreshFolders();
    };

    window.addEventListener("folders:refresh", handleRefresh);

    return () => {
      isMounted.current = false;
      
      // Limpiar timer
      if (timer) {
        window.clearTimeout(timer);
      }
      
      // Limpiar refresh timer
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      
      window.removeEventListener("folders:refresh", handleRefresh);
    };
  }, []); // ✅ Dependencias vacías = solo al montar/desmontar

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