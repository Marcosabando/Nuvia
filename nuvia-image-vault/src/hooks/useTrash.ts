import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";
import { useToast } from "@/hooks/use-toast";

export interface TrashItem {
  trashId: number; // ✅ ID REAL DE LA PAPELERA
  userId: number;
  itemType: "image" | "video" | "document" | "folder";
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
  const { toast } = useToast();

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get('/trash');

      if (response.success && response.data) {
        setTrashItems(response.data);
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
      const response = await apiService.post(`/trash/${id}/restore`, {});
      
      if (response.success) {
        toast({
          title: "✅ Restaurado",
          description: "El elemento ha sido restaurado correctamente",
        });
        await fetchTrashItems();
      } else {
        throw new Error(response.error || 'Error al restaurar');
      }
    } catch (err: any) {
      console.error("❌ Error restaurando elemento:", err);
      toast({
        title: "❌ Error",
        description: "No se pudo restaurar el elemento",
        variant: "destructive",
      });
      throw err;
    }
  };

  const permanentDelete = async (id: number) => {
    try {
      const response = await apiService.delete(`/trash/${id}`);
      
      if (response.success) {
        toast({
          title: "🗑️ Eliminado",
          description: "El elemento ha sido eliminado permanentemente",
        });
        await fetchTrashItems();
      } else {
        throw new Error(response.error || 'Error al eliminar');
      }
    } catch (err: any) {
      console.error("❌ Error eliminando elemento:", err);
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar el elemento",
        variant: "destructive",
      });
      throw err;
    }
  };

  const emptyTrash = async () => {
    try {
      const response = await apiService.delete('/trash/empty');
      
      if (response.success) {
        toast({
          title: "✅ Papelera vaciada",
          description: "Todos los elementos han sido eliminados permanentemente",
        });
        await fetchTrashItems();
      } else {
        throw new Error(response.error || 'Error al vaciar papelera');
      }
    } catch (err: any) {
      console.error("❌ Error vaciando papelera:", err);
      toast({
        title: "❌ Error",
        description: "No se pudo vaciar la papelera",
        variant: "destructive",
      });
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