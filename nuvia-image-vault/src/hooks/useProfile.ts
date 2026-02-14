import { useEffect, useState, useCallback, useRef } from "react";
import { apiService } from "@/services/api.services";

interface ProfileData {
  userId: number;
  username: string;
  email: string;
  profileImagePath: string | null;
  bio: string | null;
  location: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  storageUsed: number;
  storageLimit: number;
  imageCount: number;
  videoCount: number;
  albumCount: number;
  documentCount: number;
  totalMediaCount: number;
  storagePercentage: number;
  createdAt: string;
  lastLogin: string | null;
  updatedAt: string;
}

interface UserStats {
  userId: number;
  username: string;
  email: string;
  profileImagePath: string | null;
  bio: string | null;
  location: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  imageCount: number;
  videoCount: number;
  documentCount: number;
  albumCount: number;
  totalMediaCount: number;
  storageUsed: number;
  storageLimit: number;
  storagePercentage: number;
  trashCount: number;
  favoriteImageCount: number;
  favoriteVideoCount: number;
  favoriteDocumentCount?: number;
  totalFavorites?: number;
  createdAt: string;
  lastLogin: string | null;
}

interface UseProfileReturn {
  profile: ProfileData | null;
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfileImage: (file: File) => Promise<{ success: boolean; error?: string }>;
  updateUsername: (newUsername: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { username?: string; bio?: string; location?: string }) => Promise<{ success: boolean; error?: string }>;
  getProfileImageUrl: (options?: { size?: number; variant?: 'solid' | 'gradient' }) => string;
}

// ✅ CACHE GLOBAL para prevenir múltiples llamadas
let profileCache: ProfileData | null = null;
let statsCache: UserStats | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 segundos

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ Refs para controlar estado de llamadas
  const isMounted = useRef(true);
  const isFetching = useRef(false);
  const fetchCount = useRef(0);

  const getProfileImageUrl = useCallback((options?: { size?: number; variant?: 'solid' | 'gradient' }): string => {
    const { size = 100, variant = 'gradient' } = options || {};
    
    if (profile?.profileImagePath) {
      if (profile.profileImagePath.startsWith('http')) {
        return profile.profileImagePath;
      }
      
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      return `${baseUrl}${profile.profileImagePath.startsWith('/') ? '' : '/'}${profile.profileImagePath}`;
    }
    
    // Avatar por defecto con gradiente
    const svgContent = `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8B5CF6" />
            <stop offset="50%" stop-color="#EC4899" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#gradient)" />
        <circle cx="50" cy="35" r="15" fill="white" />
        <path d="M30 80C30 65 40 55 50 55C60 55 70 65 70 80" fill="white" />
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  }, [profile]);

  // ✅ Función para obtener perfil
  const fetchProfile = useCallback(async (forceRefresh = false) => {
    // ✅ Evitar llamadas múltiples simultáneas
    if (isFetching.current) {
      console.log('⏸️ [useProfile] Ya hay una llamada en curso, ignorando...');
      return;
    }

    // ✅ Verificar cache (si no es forceRefresh)
    const now = Date.now();
    const shouldUseCache = !forceRefresh && 
      profileCache && 
      statsCache && 
      (now - lastFetchTime) < CACHE_DURATION;

    if (shouldUseCache) {
      if (isMounted.current) {
        setProfile(profileCache);
        setStats(statsCache);
        setLoading(false);
      }
      return;
    }

    const requestId = ++fetchCount.current;
    
    isFetching.current = true;
    
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      // 1. Obtener perfil básico desde /api/profile
      const profileResponse = await apiService.get('/profile');
      
      if (!profileResponse?.success) {
        throw new Error(profileResponse?.error || 'Error al obtener perfil');
      }

      const profileData = profileResponse.data || {};
      
      const transformedProfile: ProfileData = {
        userId: profileData.userId || 0,
        username: profileData.username || 'Usuario',
        email: profileData.email || '',
        profileImagePath: profileData.profileImagePath || null,
        bio: profileData.bio || null,
        location: profileData.location || null,
        role: profileData.role || 'user',
        status: profileData.status || 'active',
        emailVerified: Boolean(profileData.emailVerified || false),
        storageUsed: Number(profileData.storageUsed || 0),
        storageLimit: Number(profileData.storageLimit || 1024 * 1024 * 1024),
        imageCount: Number(profileData.imageCount || 0),
        videoCount: Number(profileData.videoCount || 0),
        albumCount: Number(profileData.albumCount || 0),
        documentCount: Number(profileData.documentCount || 0),
        totalMediaCount: Number(profileData.totalMediaCount || 0),
        storagePercentage: profileData.storagePercentage || 0,
        createdAt: profileData.createdAt || new Date().toISOString(),
        lastLogin: profileData.lastLogin || null,
        updatedAt: profileData.updatedAt || new Date().toISOString()
      };

      // 2. Intentar obtener estadísticas detalladas desde /api/profile/stats
      let transformedStats: UserStats | null = null;
      
      try {
        const statsResponse = await apiService.get('/profile/stats');
        
        if (statsResponse?.success && statsResponse.data) {
          const statsData = statsResponse.data;
          
          const storageUsed = Number(statsData.storageUsed || transformedProfile.storageUsed || 0);
          const storageLimit = Number(statsData.storageLimit || transformedProfile.storageLimit || 1024 * 1024 * 1024);
          const storagePercentage = statsData.storagePercentage !== undefined 
            ? Number(statsData.storagePercentage)
            : storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

          transformedStats = {
            userId: statsData.userId || transformedProfile.userId,
            username: statsData.username || transformedProfile.username,
            email: statsData.email || transformedProfile.email,
            profileImagePath: statsData.profileImagePath || transformedProfile.profileImagePath,
            bio: statsData.bio || transformedProfile.bio,
            location: statsData.location || transformedProfile.location,
            role: statsData.role || transformedProfile.role,
            status: statsData.status || transformedProfile.status,
            emailVerified: Boolean(statsData.emailVerified || transformedProfile.emailVerified),
            imageCount: Number(statsData.imageCount || transformedProfile.imageCount),
            videoCount: Number(statsData.videoCount || transformedProfile.videoCount),
            documentCount: Number(statsData.documentCount || transformedProfile.documentCount),
            albumCount: Number(statsData.albumCount || transformedProfile.albumCount),
            totalMediaCount: Number(statsData.totalMediaCount || transformedProfile.totalMediaCount),
            storageUsed: storageUsed,
            storageLimit: storageLimit,
            storagePercentage: storagePercentage,
            trashCount: Number(statsData.trashCount || 0),
            favoriteImageCount: Number(statsData.favoriteImageCount || statsData.favoriteImagesCount || 0),
            favoriteVideoCount: Number(statsData.favoriteVideoCount || statsData.favoriteVideosCount || 0),
            favoriteDocumentCount: Number(statsData.favoriteDocumentCount || statsData.favoriteDocumentsCount || 0),
            totalFavorites: Number(statsData.totalFavorites || 0),
            createdAt: statsData.createdAt || transformedProfile.createdAt,
            lastLogin: statsData.lastLogin || transformedProfile.lastLogin
          };
        }
      } catch (statsError) {
        console.warn('⚠️ [useProfile] Error en stats, usando datos del perfil:', statsError);
        // Continuamos sin estadísticas detalladas
      }

      // ✅ Actualizar cache y estado
      if (isMounted.current) {
        profileCache = transformedProfile;
        
        // Crear stats fallback si no hay transformedStats
        const fallbackStats: UserStats = {
          ...transformedProfile,
          documentCount: transformedProfile.documentCount || 0,
          storagePercentage: transformedProfile.storagePercentage || 
            (transformedProfile.storageLimit > 0 
              ? Math.round((transformedProfile.storageUsed / transformedProfile.storageLimit) * 100) 
              : 0),
          trashCount: 0,
          favoriteImageCount: 0,
          favoriteVideoCount: 0,
          favoriteDocumentCount: 0,
          totalFavorites: 0
        };
        
        statsCache = transformedStats || fallbackStats;
        
        lastFetchTime = now;
        
        setProfile(transformedProfile);
        setStats(transformedStats || fallbackStats);
        setLoading(false);
      }

    } catch (err: any) {
      console.error(`❌ [useProfile #${requestId}] Error:`, err);
      
      if (isMounted.current) {
        setError(
          err.error || 
          err.message || 
          "No se pudo cargar el perfil. Verifica tu conexión y autenticación."
        );
        setLoading(false);
        
        // Si es error de autenticación, redirigir al login
        if (err.status === 401 || err.message?.includes('token') || err.message?.includes('autenticación')) {
          console.log('🔐 Redirigiendo al login...');
          localStorage.clear();
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
      }
    } finally {
      isFetching.current = false;
    }
  }, []);

  // ✅ useEffect CORREGIDO - se ejecuta solo una vez
  useEffect(() => {
    isMounted.current = true;
    
    // Pequeño delay para asegurar que el componente está completamente montado
    const timer = setTimeout(() => {
      fetchProfile();
    }, 100);
    
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  const updateUsername = async (newUsername: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`🔄 [useProfile] Actualizando username a: ${newUsername}`);
      const response = await apiService.patch("/profile/username", { username: newUsername });

      if (response.success) {
        console.log('✅ [useProfile] Username actualizado correctamente');
        // Invalidar cache
        profileCache = null;
        statsCache = null;
        
        // Actualizar estado local
        setProfile(prev => prev ? { ...prev, username: newUsername } : null);
        setStats(prev => prev ? { ...prev, username: newUsername } : null);
        return { success: true };
      }

      return { 
        success: false, 
        error: response.error || "Error al actualizar el nombre de usuario" 
      };
    } catch (err: any) {
      console.error("❌ [useProfile] Error actualizando username:", err);
      return {
        success: false,
        error: err.error || err.message || "Error desconocido"
      };
    }
  };

  const updateProfile = async (data: { username?: string; bio?: string; location?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`🔄 [useProfile] Actualizando perfil:`, data);
      
      const response = await apiService.put('/profile', data);

      if (response.success) {
        console.log('✅ [useProfile] Perfil actualizado correctamente');
        // Invalidar cache
        profileCache = null;
        statsCache = null;
        
        // Actualizar estado local
        setProfile(prev => prev ? { ...prev, ...data } : null);
        setStats(prev => prev ? { ...prev, ...data } : null);
        
        // Refrescar datos después de actualizar
        setTimeout(() => fetchProfile(true), 500);
        return { success: true };
      }

      return { 
        success: false, 
        error: response.error || "Error al actualizar el perfil" 
      };
    } catch (err: any) {
      console.error("❌ [useProfile] Error actualizando perfil:", err);
      return {
        success: false,
        error: err.error || err.message || "Error desconocido"
      };
    }
  };

  // ✅ MÉTODO CORREGIDO - updateProfileImage
  const updateProfileImage = async (file: File): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔄 [useProfile] Subiendo imagen de perfil...');
      console.log('📁 Archivo:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      });

      // Crear FormData con el nombre de campo correcto
      const formData = new FormData();
      formData.append('profileImage', file); // ✅ Nombre de campo correcto

      console.log('📤 FormData creado con campo "profileImage"');

      // Llamar al endpoint correcto
      const response = await apiService.post('/profile/image', formData);

      console.log('📥 Respuesta del servidor:', response);

      if (response.success) {
        console.log('✅ [useProfile] Imagen actualizada correctamente');
        // Invalidar cache y refrescar
        profileCache = null;
        statsCache = null;
        await fetchProfile(true); // Force refresh
        return { success: true };
      } else {
        console.error('❌ Error del servidor:', response.error);
        return { success: false, error: response.error };
      }
    } catch (err: any) {
      console.error('❌ [useProfile] Error subiendo imagen:', err);
      return { 
        success: false, 
        error: err.error || err.message || "Error al subir la imagen" 
      };
    }
  };

  return {
    profile,
    stats,
    loading,
    error,
    refetch: () => fetchProfile(true), // Force refresh
    updateProfileImage,
    updateUsername,
    updateProfile,
    getProfileImageUrl
  };
};