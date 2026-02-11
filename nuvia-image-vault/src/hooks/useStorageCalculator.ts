// src/hooks/useStorageCalculator.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { apiService } from "@/services/api.services";

interface StorageStats {
  totalUsed: number; // En bytes
  totalUsedGB: number; // En GB
  totalLimit: number; // En bytes
  totalLimitGB: number; // En GB
  percentage: number; // Porcentaje usado (0-100)
  byType: {
    images: {
      count: number;
      size: number; // bytes
      sizeGB: number;
    };
    videos: {
      count: number;
      size: number;
      sizeGB: number;
    };
    documents: {
      count: number;
      size: number;
      sizeGB: number;
    };
  };
  formatted: {
    used: string; // "1.23 GB"
    limit: string; // "5.00 GB"
    available: string; // "3.77 GB"
  };
}

interface UseStorageCalculatorReturn {
  storage: StorageStats;
  loading: boolean;
  error: string | null;
  recalculate: () => Promise<void>;
}

// ✅ Cache global
let storageCache: StorageStats | null = null;
let lastCalculationTime = 0;
const CACHE_DURATION = 60000;

const DEFAULT_STORAGE: StorageStats = {
  totalUsed: 0,
  totalUsedGB: 0,
  totalLimit: 5368709120,
  totalLimitGB: 5,
  percentage: 0,
  byType: {
    images: { count: 0, size: 0, sizeGB: 0 },
    videos: { count: 0, size: 0, sizeGB: 0 },
    documents: { count: 0, size: 0, sizeGB: 0 }
  },
  formatted: {
    used: "0 MB",
    limit: "5.00 GB",
    available: "5.00 GB"
  }
};

export const useStorageCalculator = (): UseStorageCalculatorReturn => {
  const [storage, setStorage] = useState<StorageStats>(DEFAULT_STORAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const isCalculating = useRef(false);
  const calculationCount = useRef(0);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    const kb = bytes / 1024;
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    } else if (mb >= 1) {
      return `${Math.round(mb)} MB`;
    } else if (kb >= 1) {
      return `${Math.round(kb)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  };

  const calculateStorage = useCallback(async (forceRefresh = false) => {
    if (isCalculating.current) {
      console.log('⏸️ [useStorageCalculator] Ya hay un cálculo en curso, ignorando...');
      return;
    }

    const now = Date.now();
    const shouldUseCache = !forceRefresh && 
      storageCache && 
      (now - lastCalculationTime) < CACHE_DURATION;

    if (shouldUseCache) {
      console.log('💾 [useStorageCalculator] Usando datos cacheados');
      if (isMounted.current) {
        setStorage(storageCache);
        setLoading(false);
      }
      return;
    }

    const requestId = ++calculationCount.current;
    
    isCalculating.current = true;
    
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      let storageLimit = 5368709120;
      
      try {
        const profileResponse = await apiService.get('/profile');
        if (profileResponse.success && profileResponse.data?.storageLimit) {
          storageLimit = Number(profileResponse.data.storageLimit);
        }
      } catch (profileError) {
        console.warn('⚠️ No se pudo obtener límite del perfil, usando 5GB por defecto');
      }

      let imagesSize = 0;
      let imagesCount = 0;
      
      try {
        console.time(`⏱️ [useStorageCalculator #${requestId}] Imágenes`);
        const imagesResponse = await apiService.get('/images');
        
        if (imagesResponse.success && Array.isArray(imagesResponse.data)) {
          imagesCount = imagesResponse.data.length;
          imagesSize = imagesResponse.data.reduce((total: number, img: any) => {
            const size = Number(img.fileSize || 0);
            return total + size;
          }, 0);
        }
      } catch (imgError) {
        console.warn('⚠️ Error calculando imágenes:', imgError);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      let videosSize = 0;
      let videosCount = 0;
      
      try {
        console.time(`⏱️ [useStorageCalculator #${requestId}] Videos`);
        const videosResponse = await apiService.get('/videos');
        
        if (videosResponse.success && Array.isArray(videosResponse.data)) {
          videosCount = videosResponse.data.length;
          videosSize = videosResponse.data.reduce((total: number, vid: any) => {
            const size = Number(vid.fileSize || 0);
            return total + size;
          }, 0);
        }
      } catch (vidError) {
        console.warn('⚠️ Error calculando videos:', vidError);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      let documentsSize = 0;
      let documentsCount = 0;
      
      try {
        console.time(`⏱️ [useStorageCalculator #${requestId}] Documentos`);
        const documentsResponse = await apiService.get('/documents');
        
        if (documentsResponse.success && Array.isArray(documentsResponse.data)) {
          documentsCount = documentsResponse.data.length;
          documentsSize = documentsResponse.data.reduce((total: number, doc: any) => {
            const size = Number(doc.fileSize || 0);
            return total + size;
          }, 0);
        }
      } catch (docError) {
        console.warn('⚠️ Error calculando documentos:', docError);
      }

      const totalUsed = imagesSize + videosSize + documentsSize;
      const totalUsedGB = totalUsed / (1024 * 1024 * 1024);
      const totalLimitGB = storageLimit / (1024 * 1024 * 1024);
      const percentage = storageLimit > 0 
        ? Math.min(Math.round((totalUsed / storageLimit) * 100), 100) 
        : 0;
      const available = Math.max(0, storageLimit - totalUsed);

      const calculatedStorage: StorageStats = {
        totalUsed,
        totalUsedGB,
        totalLimit: storageLimit,
        totalLimitGB,
        percentage,
        byType: {
          images: {
            count: imagesCount,
            size: imagesSize,
            sizeGB: imagesSize / (1024 * 1024 * 1024)
          },
          videos: {
            count: videosCount,
            size: videosSize,
            sizeGB: videosSize / (1024 * 1024 * 1024)
          },
          documents: {
            count: documentsCount,
            size: documentsSize,
            sizeGB: documentsSize / (1024 * 1024 * 1024)
          }
        },
        formatted: {
          used: formatBytes(totalUsed),
          limit: formatBytes(storageLimit),
          available: formatBytes(available)
        }
      };

      if (isMounted.current) {
        storageCache = calculatedStorage;
        lastCalculationTime = now;
        
        setStorage(calculatedStorage);
        setLoading(false);
        
      }

    } catch (err: any) {
      console.error(`❌ [useStorageCalculator #${requestId}] Error:`, err);
      
      if (isMounted.current) {
        setError(
          err.error || 
          err.message || 
          "No se pudo calcular el almacenamiento"
        );
        setLoading(false);
      }
    } finally {
      isCalculating.current = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    
    // Pequeño delay
    const timer = setTimeout(() => {
      calculateStorage();
    }, 200);
    
    const handleStorageUpdate = () => {
      console.log('🔄 [useStorageCalculator] Evento de actualización recibido');
      storageCache = null;
      calculateStorage(true);
    };

    window.addEventListener("storage:update", handleStorageUpdate);
    
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      window.removeEventListener("storage:update", handleStorageUpdate);
    };
  }, []);

  return {
    storage,
    loading,
    error,
    recalculate: () => {
      storageCache = null;
      return calculateStorage(true);
    }
  };
};