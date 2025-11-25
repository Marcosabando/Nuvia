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

  const generateFallbackId = (name: string): number => {
    return Math.abs(
      name.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)
    );
  };

  const createSampleFolders = () => {
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

  const fetchFolders = async () => {
    try {
      setLoading(true);

      const response = await apiService.get('/folders');

      if (response.success && response.data) {
        const folders: Folder[] = response.data.map((item: any) => {
          const id = item.id || item.folderId || generateFallbackId(item.name);

          return {
            id,
            name: item.name,
            description: item.description,
            color: item.color || '#6B7280',
            isSystem: item.isSystem || false,
            itemCount: item.itemCount || 0,
            createdAt: item.createdAt || new Date().toISOString()
          };
        });

        setSystemFolders(folders.filter(f => f.isSystem));
        setUserFolders(folders.filter(f => !f.isSystem));
      } else {
        createSampleFolders();
      }
    } catch {
      createSampleFolders();
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (data: any) => {
    try {
      const response = await apiService.post('/folders', data);
      if (response.success) {
        await fetchFolders();
      } else {
        throw new Error(response.error || 'Error creating folder');
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteFolder = async (folderId: number) => {
    try {
      const response = await apiService.delete(`/folders/${folderId}`);
      if (response.success) {
        await fetchFolders();
      } else {
        throw new Error(response.error || 'Error deleting folder');
      }
    } catch (error) {
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
