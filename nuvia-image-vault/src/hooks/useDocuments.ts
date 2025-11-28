// src/hooks/useDocuments.ts
import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";

interface DocumentData {
  id: number;
  documentId?: number;
  userId: number;
  title: string;
  description?: string;
  category: string;
  tags?: string;
  originalFilename: string;
  filename: string;
  documentPath: string;
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
  refetch: () => void;
}

export const useDocuments = (): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get('/documents');

      if (response.success && response.data) {
        const transformedDocuments = response.data.map((doc: any) => ({
          id: doc.documentId || doc.id,
          documentId: doc.documentId,
          userId: doc.userId,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          tags: doc.tags,
          originalFilename: doc.originalFilename,
          filename: doc.filename,
          documentPath: doc.documentPath,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          pageCount: doc.pageCount,
          wordCount: doc.wordCount,
          language: doc.language,
          isFavorite: doc.isFavorite || false,
          isPublic: doc.isPublic || false,
          version: doc.version || 1,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt || doc.createdAt
        }));

        setDocuments(transformedDocuments);

      } else {
        throw new Error(response.error || 'Error en la respuesta del servidor');
      }

    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(`Error del servidor: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError("No se pudieron cargar los documentos");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments
  };
};