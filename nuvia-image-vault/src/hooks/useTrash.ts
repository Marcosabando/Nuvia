import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";

interface TrashItem {
  id: number;
  userId: number;
  itemType: 'image' | 'video' | 'document' | 'folder';
  itemId: number;
  originalName: string;
  originalPath: string;
  fileSize: number;
  mimeType: string;
  deletedAt: string;
  permanentDeleteAt: string;
}

interface UseTrashReturn {
  trashItems: TrashItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  restoreItem: (id: number) => Promise<void>;
  permanentDelete: (id: number) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

export const useTrash = (): UseTrashReturn => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🗑️ Obteniendo elementos de la papelera...");
      
      const response = await apiService.get('/trash');
      
      console.log("📦 Respuesta de papelera:", response);

      if (response.success && response.data) {
        setTrashItems(response.data);
        console.log("✅ Elementos de papelera cargados:", response.data.length);
      } else {
        throw new Error(response.error || 'Error en la respuesta del servidor');
      }

    } catch (err: any) {
      console.error("❌ Error cargando papelera:", err);
      
      if (err.response?.data?.error) {
        setError(`Error del servidor: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError("No se pudieron cargar los elementos de la papelera");
      }
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = async (id: number) => {
    try {
      console.log("♻️ Restaurando elemento:", id);
      
      const response = await apiService.post(`/trash/${id}/restore`, {});
      
      if (response.success) {
        console.log("✅ Elemento restaurado correctamente");
        await fetchTrashItems(); // Recargar lista
      } else {
        throw new Error(response.error || 'Error al restaurar');
      }
    } catch (err: any) {
      console.error("❌ Error restaurando elemento:", err);
      throw err;
    }
  };

  const permanentDelete = async (id: number) => {
    try {
      console.log("🔥 Eliminando permanentemente:", id);
      
      const response = await apiService.delete(`/trash/${id}`);
      
      if (response.success) {
        console.log("✅ Elemento eliminado permanentemente");
        await fetchTrashItems(); // Recargar lista
      } else {
        throw new Error(response.error || 'Error al eliminar');
      }
    } catch (err: any) {
      console.error("❌ Error eliminando elemento:", err);
      throw err;
    }
  };

  const emptyTrash = async () => {
    try {
      console.log("🗑️ Vaciando papelera...");
      
      const response = await apiService.delete('/trash/empty');
      
      if (response.success) {
        console.log("✅ Papelera vaciada correctamente");
        await fetchTrashItems(); // Recargar lista
      } else {
        throw new Error(response.error || 'Error al vaciar papelera');
      }
    } catch (err: any) {
      console.error("❌ Error vaciando papelera:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, []);

  return {
    trashItems,
    loading,
    error,
    refetch: fetchTrashItems,
    restoreItem,
    permanentDelete,
    emptyTrash
  };
};
