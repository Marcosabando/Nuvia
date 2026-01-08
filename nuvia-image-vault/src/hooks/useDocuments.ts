// src/hooks/useDocuments.ts - VERSIÓN CORREGIDA
import { useState, useEffect, useCallback } from "react";

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
  toggleFavorite: (id: number, isFavorite: boolean) => Promise<boolean>;
  deleteDocument: (id: number) => Promise<boolean>;
  renameDocument: (id: number, title: string) => Promise<boolean>;
}

const API_BASE = "http://localhost:3000";

export const useDocuments = (): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 FUNCIÓN CORREGIDA: Obtener el token correcto
  const getAuthToken = (): string | null => {
    // Primero intentar con 'authToken' (el que usa tu login)
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      console.log('🔐 [useDocuments] Usando authToken del login');
      return authToken;
    }
    
    // Si no existe, intentar con 'token' (alternativo)
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔐 [useDocuments] Usando token alternativo');
      return token;
    }
    
    console.error('❌ [useDocuments] No hay token disponible');
    return null;
  };

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📁 [useDocuments] Iniciando fetch...');
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No estás autenticado. Por favor, inicia sesión.');
      }

      console.log('📁 [useDocuments] Token disponible, haciendo petición...');

      // 🔥 USANDO FETCH DIRECTAMENTE CON EL TOKEN CORRECTO
      const response = await fetch(`${API_BASE}/api/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📁 [useDocuments] Status de respuesta:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido o expirado. Por favor, inicia sesión nuevamente.');
        }
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('📁 [useDocuments] Respuesta del servidor:', data);

      if (data.success && Array.isArray(data.data)) {
        console.log(`📁 [useDocuments] Encontrados ${data.data.length} documentos`);
        
        const transformedDocuments = data.data.map((doc: any) => ({
          id: doc.documentId || doc.id,
          documentId: doc.documentId || doc.id,
          userId: doc.userId,
          title: doc.title,
          description: doc.description,
          category: doc.category || 'other',
          tags: doc.tags,
          originalFilename: doc.originalFilename,
          filename: doc.filename,
          documentPath: doc.documentPath,
          thumbnailPath: doc.thumbnailPath,
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
        }));

        console.log('📁 [useDocuments] Documentos transformados:', transformedDocuments);
        setDocuments(transformedDocuments);
      } else {
        console.error('📁 [useDocuments] Formato de respuesta inválido:', data);
        throw new Error(data.error || 'Error en la respuesta del servidor');
      }

    } catch (err: any) {
      console.error('📁 [useDocuments] Error:', err);
      setError(err.message || "No se pudieron cargar los documentos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Resto de las funciones (toggleFavorite, deleteDocument, renameDocument)...
  // Asegúrate de que también usen getAuthToken()

  const toggleFavorite = async (id: number, isFavorite: boolean): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE}/api/documents/${id}/favorite`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isFavorite })
      });

      if (!response.ok) return false;
      
      const data = await response.json();
      if (data.success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === id ? { ...doc, isFavorite } : doc
        ));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: number): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE}/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) return false;
      
      const data = await response.json();
      if (data.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const renameDocument = async (id: number, title: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE}/api/documents/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) return false;
      
      const data = await response.json();
      if (data.success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === id ? { ...doc, title } : doc
        ));
        return true;
      }
      return false;
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