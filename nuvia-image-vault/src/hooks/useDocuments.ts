// src/hooks/useDocuments.ts
import { useEffect, useState, useCallback } from "react";
import { apiService } from "@/services/api.services";

interface DocumentData {
  id: number;
  documentId: number;
  userId: number;
  title: string;
  description?: string;
  category: string;
  tags?: string;
  originalFilename: string;
  filename: string;
  documentPath: string;
  thumbnailPath?: string;
  previewPath?: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  isFavorite: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface UseDocumentsReturn {
  documents: DocumentData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggleFavorite: (id: number, isFavorite: boolean) => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;
  renameDocument: (id: number, title: string) => Promise<void>;
}

const determineCategory = (doc: any): string => {
  if (doc.category && doc.category !== 'other') return doc.category;
  
  const mimeType = doc.mimeType?.toLowerCase() || '';
  
  if (mimeType.includes('pdf') || 
      mimeType.includes('word') || 
      mimeType.includes('excel') || 
      mimeType.includes('powerpoint') ||
      mimeType.includes('officedocument') ||
      mimeType.includes('opendocument') ||
      mimeType === 'application/rtf') {
    return 'office';
  } else if (mimeType.startsWith('text/') || 
             mimeType.includes('json') || 
             mimeType.includes('xml') ||
             mimeType.includes('markdown')) {
    return 'text';
  } else if (mimeType.includes('zip') || 
             mimeType.includes('rar') || 
             mimeType.includes('7z') ||
             mimeType.includes('tar') ||
             mimeType.includes('gzip')) {
    return 'archive';
  } else if (mimeType.includes('javascript') || 
             mimeType.includes('html') || 
             mimeType.includes('css') ||
             mimeType.includes('python') ||
             mimeType.includes('java')) {
    return 'code';
  } else if (mimeType.startsWith('image/') || 
             mimeType.includes('svg') ||
             mimeType.includes('font/')) {
    return 'design';
  }
  
  return doc.category || 'other';
};

export const useDocuments = (): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get('/documents');

      if (response.success && response.data) {
        const transformedDocuments = Array.isArray(response.data) 
          ? response.data.map((doc: any) => ({
              id: doc.documentId || doc.id,
              documentId: doc.documentId || doc.id,
              userId: doc.userId,
              title: doc.title || doc.originalFilename?.replace(/\.[^/.]+$/, "") || "Sin título",
              description: doc.description,
              category: determineCategory(doc),
              tags: doc.tags,
              originalFilename: doc.originalFilename,
              filename: doc.filename,
              documentPath: doc.documentPath,
              thumbnailPath: doc.thumbnailPath,
              previewPath: doc.previewPath,
              fileSize: doc.fileSize,
              mimeType: doc.mimeType,
              pageCount: doc.pageCount,
              wordCount: doc.wordCount,
              language: doc.language,
              isFavorite: Boolean(doc.isFavorite),
              isPublic: Boolean(doc.isPublic),
              version: doc.version || 1,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt || doc.createdAt
            }))
          : [];

        setDocuments(transformedDocuments);
      } else {
        throw new Error(response.error || 'Error en la respuesta del servidor');
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        "No se pudieron cargar los documentos"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = async (id: number, isFavorite: boolean): Promise<void> => {
    try {
      const response = await apiService.patch(`/documents/${id}/favorite`, { isFavorite });
      if (response.success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === id ? { ...doc, isFavorite } : doc
        ));
      } else {
        throw new Error(response.error || 'Error al actualizar favorito');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: number): Promise<void> => {
    try {
      const response = await apiService.delete(`/documents/${id}`);
      if (response.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
      } else {
        throw new Error(response.error || 'Error al eliminar documento');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const renameDocument = async (id: number, title: string): Promise<void> => {
    try {
      const response = await apiService.patch(`/documents/${id}`, { title });
      if (response.success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === id ? { ...doc, title } : doc
        ));
      } else {
        throw new Error(response.error || 'Error al renombrar documento');
      }
    } catch (error) {
      console.error('Error renaming document:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    toggleFavorite,
    deleteDocument,
    renameDocument
  };
};