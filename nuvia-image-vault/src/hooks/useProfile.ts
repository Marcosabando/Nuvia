// src/hooks/useProfile.ts - VERSIÓN CORREGIDA
import { useEffect, useState } from "react";
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
  totalMediaCount: number;
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
  albumCount: number;
  totalMediaCount: number;
  storageUsed: number;
  storageLimit: number;
  storagePercentage: number;
  trashCount: number;
  favoriteImageCount: number;
  favoriteVideoCount: number;
  createdAt: string;
  lastLogin: string | null;
}

interface UseProfileReturn {
  profile: ProfileData | null;
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateProfileImage: (file: File) => Promise<{ success: boolean; error?: string }>;
}

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);


      // Obtener perfil del usuario
      const profileResponse = await apiService.get('/profile');

      if (profileResponse.success && profileResponse.data) {
        const transformedProfile: ProfileData = {
          userId: profileResponse.data.userId,
          username: profileResponse.data.username,
          email: profileResponse.data.email,
          profileImagePath: profileResponse.data.profileImagePath,
          bio: profileResponse.data.bio,
          location: profileResponse.data.location,
          role: profileResponse.data.role,
          status: profileResponse.data.status,
          emailVerified: Boolean(profileResponse.data.emailVerified),
          storageUsed: Number(profileResponse.data.storageUsed),
          storageLimit: Number(profileResponse.data.storageLimit),
          imageCount: Number(profileResponse.data.imageCount),
          videoCount: Number(profileResponse.data.videoCount),
          albumCount: Number(profileResponse.data.albumCount),
          totalMediaCount: Number(profileResponse.data.totalMediaCount),
          createdAt: profileResponse.data.createdAt,
          lastLogin: profileResponse.data.lastLogin,
          updatedAt: profileResponse.data.updatedAt
        };

        setProfile(transformedProfile);
      } else {
        throw new Error(profileResponse.error || 'Error en la respuesta del perfil');
      }

      // Obtener estadísticas del usuario
      const statsResponse = await apiService.get('/profile/stats');

      if (statsResponse.success && statsResponse.data) {
        const transformedStats: UserStats = {
          userId: statsResponse.data.userId,
          username: statsResponse.data.username,
          email: statsResponse.data.email,
          profileImagePath: statsResponse.data.profileImagePath,
          bio: statsResponse.data.bio,
          location: statsResponse.data.location,
          role: statsResponse.data.role,
          status: statsResponse.data.status,
          emailVerified: Boolean(statsResponse.data.emailVerified),
          imageCount: Number(statsResponse.data.imageCount),
          videoCount: Number(statsResponse.data.videoCount),
          albumCount: Number(statsResponse.data.albumCount),
          totalMediaCount: Number(statsResponse.data.totalMediaCount),
          storageUsed: Number(statsResponse.data.storageUsed),
          storageLimit: Number(statsResponse.data.storageLimit),
          storagePercentage: Number(statsResponse.data.storagePercentage),
          trashCount: Number(statsResponse.data.trashCount),
          favoriteImageCount: Number(statsResponse.data.favoriteImageCount),
          favoriteVideoCount: Number(statsResponse.data.favoriteVideoCount),
          createdAt: statsResponse.data.createdAt,
          lastLogin: statsResponse.data.lastLogin
        };

        setStats(transformedStats);
      }

    } catch (err: any) {
      console.error('❌ [useProfile] Error:', err);
      
      if (err.response?.data?.error) {
        setError(`Error del servidor: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError("No se pudo cargar el perfil");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Función para actualizar imagen de perfil
  const updateProfileImage = async (file: File): Promise<{ success: boolean; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await apiService.post('/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success) {
        // Actualizar el perfil local con la nueva imagen
        if (profile) {
          setProfile({
            ...profile,
            profileImagePath: response.data.profileImagePath
          });
        }
        
        // También actualizar stats si existen
        if (stats) {
          setStats({
            ...stats,
            profileImagePath: response.data.profileImagePath
          });
        }
        return { success: true };
      } else {
        console.error('❌ [useProfile] Error en respuesta:', response.error);
        return { success: false, error: response.error || 'Error al actualizar la imagen' };
      }
    } catch (err: any) {
      console.error('❌ [useProfile] Error subiendo imagen:', err);
      
      const errorMsg = err.response?.data?.error || err.message || 'Error al subir la imagen';
      return { success: false, error: errorMsg };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    stats,
    loading,
    error,
    refetch: fetchProfile,
    updateProfileImage // ✅ Exportar la función de actualización
  };
};