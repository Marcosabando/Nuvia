import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.services';

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
  createFolder: (data: any) => Promise<void>;
  deleteFolder: (folderId: number) => Promise<void>;
  refreshFolders: () => Promise<void>;
}

export const useFolders = (): UseFoldersReturn => {
  const [systemFolders, setSystemFolders] = useState<Folder[]>([]);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      console.log("🔄 Obteniendo carpetas...");
      
      const response = await apiService.get('/folders');
      console.log("📂 Respuesta completa de carpetas:", response);
      
      if (response.success && response.data) {
        // ✅ Mapeo robusto para diferentes estructuras de datos
        const folders: Folder[] = response.data.map((item: any) => {
          // Intentar obtener el ID de diferentes formas
          const id = item.id || item.folderId || generateFallbackId(item.name);
          
          console.log(`📁 Procesando carpeta: ${item.name}`, {
            originalId: item.id,
            folderId: item.folderId,
            finalId: id
          });
          
          return {
            id: id,
            name: item.name,
            description: item.description,
            color: item.color || '#6B7280', // Color por defecto
            isSystem: item.isSystem || false,
            itemCount: item.itemCount || 0,
            createdAt: item.createdAt || new Date().toISOString()
          };
        });

        console.log("✅ Carpetas procesadas:", folders);
        
        setSystemFolders(folders.filter(folder => folder.isSystem));
        setUserFolders(folders.filter(folder => !folder.isSystem));
      } else {
        console.error("❌ Error en respuesta de carpetas:", response.error);
        // Crear carpetas de ejemplo para testing
        createSampleFolders();
      }
    } catch (error) {
      console.error('❌ Error fetching folders:', error);
      // Crear carpetas de ejemplo en caso de error
      createSampleFolders();
    } finally {
      setLoading(false);
    }
  };

  // Función para generar IDs de respaldo
  const generateFallbackId = (name: string): number => {
    return Math.abs(name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0));
  };

  // Carpeta de ejemplo para testing
  const createSampleFolders = () => {
    console.log("🛠️ Creando carpetas de ejemplo...");
    const sampleFolders: Folder[] = [
      {
        id: 1,
        name: "Carpeta Personal",
        description: "Mis archivos personales",
        color: "#EF4444",
        isSystem: false,
        itemCount: 5,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "Trabajo",
        description: "Archivos de trabajo",
        color: "#3B82F6",
        isSystem: false,
        itemCount: 3,
        createdAt: new Date().toISOString()
      }
    ];
    
    setSystemFolders([]);
    setUserFolders(sampleFolders);
  };

  const createFolder = async (data: any) => {
    console.log("📝 Creando carpeta:", data);
    try {
      const response = await apiService.post('/folders', data);
      if (response.success) {
        console.log("✅ Carpeta creada:", response.data);
        await fetchFolders();
      } else {
        throw new Error(response.error || 'Error creating folder');
      }
    } catch (error) {
      console.error("❌ Error creando carpeta:", error);
      throw error;
    }
  };

  const deleteFolder = async (folderId: number) => {
    console.log("🗑️ Eliminando carpeta:", folderId);
    try {
      const response = await apiService.delete(`/folders/${folderId}`);
      if (response.success) {
        console.log("✅ Carpeta eliminada");
        await fetchFolders();
      } else {
        throw new Error(response.error || 'Error deleting folder');
      }
    } catch (error) {
      console.error("❌ Error eliminando carpeta:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  return {
    systemFolders,
    userFolders,
    loading,
    createFolder,
    deleteFolder,
    refreshFolders: fetchFolders,
  };
};