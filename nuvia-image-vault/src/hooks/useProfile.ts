// src/hooks/useProfile.ts (versión con useFolders)
import { useEffect, useState } from "react";
import { apiService } from "@/services/api.services";
import { useFolders } from "./useFolders"; // Importa el hook de carpetas

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
  documentCount: number;
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
  updateUsername: (newUsername: string) => Promise<{ success: boolean; error?: string }>;
  getProfileImageUrl: (options?: { size?: number; variant?: 'solid' | 'gradient' }) => string;
}

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Usar el hook de carpetas para obtener el conteo real
  const { userFolders, loading: foldersLoading } = useFolders();

  const getProfileImageUrl = (options?: { size?: number; variant?: 'solid' | 'gradient' }): string => {
    const { size = 100, variant = 'gradient' } = options || {};
    
    if (profile?.profileImagePath) {
      if (profile.profileImagePath.startsWith('http')) {
        return profile.profileImagePath;
      }
      
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      return `${baseUrl}${profile.profileImagePath.startsWith('/') ? '' : '/'}${profile.profileImagePath}`;
    }
    
    const svgContent = `
      <svg 
        width="${size}" 
        height="${size}" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="11" stroke="#8B5CF6" stroke-width="2" fill="none" />
        <circle cx="12" cy="9" r="4" fill="#8B5CF6" />
        <path d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20" fill="#8B5CF6" />
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileResponse = await apiService.get('/profile');

      if (profileResponse.success && profileResponse.data) {
        const transformedProfile: ProfileData = {
          userId: profileResponse.data.userId || 0,
          username: profileResponse.data.username || 'Usuario',
          email: profileResponse.data.email || '',
          profileImagePath: profileResponse.data.profileImagePath || null,
          bio: profileResponse.data.bio || null,
          location: profileResponse.data.location || null,
          role: profileResponse.data.role || 'user',
          status: profileResponse.data.status || 'active',
          emailVerified: Boolean(profileResponse.data.emailVerified),
          storageUsed: Number(profileResponse.data.storageUsed || 0),
          storageLimit: Number(profileResponse.data.storageLimit || 1024 * 1024 * 1024),
          imageCount: Number(profileResponse.data.imageCount || 0),
          videoCount: Number(profileResponse.data.videoCount || 0),
          albumCount: Number(profileResponse.data.albumCount || 0),
          totalMediaCount: Number(profileResponse.data.totalMediaCount || 0),
          createdAt: profileResponse.data.createdAt || new Date().toISOString(),
          lastLogin: profileResponse.data.lastLogin || null,
          updatedAt: profileResponse.data.updatedAt || new Date().toISOString()
        };

        setProfile(transformedProfile);
      } else {
        throw new Error(profileResponse.error || 'Error en la respuesta del perfil');
      }

      const statsResponse = await apiService.get('/profile/stats');

      if (statsResponse.success && statsResponse.data) {
        const storageUsed = Number(statsResponse.data.storageUsed || 0);
        const storageLimit = Number(statsResponse.data.storageLimit || 1024 * 1024 * 1024);
        const storagePercentage = statsResponse.data.storagePercentage !== undefined 
          ? Number(statsResponse.data.storagePercentage)
          : storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

        const transformedStats: UserStats = {
          userId: statsResponse.data.userId || profile?.userId || 0,
          username: statsResponse.data.username || profile?.username || 'Usuario',
          email: statsResponse.data.email || profile?.email || '',
          profileImagePath: statsResponse.data.profileImagePath || profile?.profileImagePath || null,
          bio: statsResponse.data.bio || profile?.bio || null,
          location: statsResponse.data.location || profile?.location || null,
          role: statsResponse.data.role || profile?.role || 'user',
          status: statsResponse.data.status || profile?.status || 'active',
          emailVerified: Boolean(statsResponse.data.emailVerified || profile?.emailVerified),
          imageCount: Number(statsResponse.data.imageCount || 0),
          videoCount: Number(statsResponse.data.videoCount || 0),
          documentCount: Number(statsResponse.data.documentCount || 0),
          albumCount: userFolders.length,
          totalMediaCount: Number(statsResponse.data.totalMediaCount || 0),
          storageUsed: storageUsed,
          storageLimit: storageLimit,
          storagePercentage: storagePercentage,
          trashCount: Number(statsResponse.data.trashCount || 0),
          favoriteImageCount: Number(statsResponse.data.favoriteImageCount || 0),
          favoriteVideoCount: Number(statsResponse.data.favoriteVideoCount || 0),
          createdAt: statsResponse.data.createdAt || profile?.createdAt || new Date().toISOString(),
          lastLogin: statsResponse.data.lastLogin || profile?.lastLogin || null
        };

        setStats(transformedStats);
      }

    } catch (err: any) {
      console.error('❌ [useProfile] Error:', err);
      setError(err.response?.data?.error || err.message || "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (stats && !foldersLoading) {
      setStats({
        ...stats,
        albumCount: userFolders.length
      });
    }
  }, [userFolders, foldersLoading]);

  const updateUsername = async (
    newUsername: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiService.put("/profile/username", { username: newUsername });

      if (response.success) {
        if (profile) {
          setProfile({
            ...profile,
            username: newUsername
          });
        }

        if (stats) {
          setStats({
            ...stats,
            username: newUsername
          });
        }

        return { success: true };
      }

      return { success: false, error: response.error || "Error al actualizar el nombre de usuario" };
    } catch (err: any) {
      console.error("❌ Error actualizando username:", err);
      return {
        success: false,
        error: err.response?.data?.error || err.message || "Error desconocido"
      };
    }
  };

  const updateProfileImage = async (file: File): Promise<{ success: boolean; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await apiService.post('/profile/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.success) {
        if (profile) {
          setProfile({
            ...profile,
            profileImagePath: response.data.profileImagePath
          });
        }
        if (stats) {
          setStats({
            ...stats,
            profileImagePath: response.data.profileImagePath
          });
        }

        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    stats,
    loading: loading || foldersLoading,
    error,
    refetch: fetchProfile,
    updateProfileImage,
    updateUsername,
    getProfileImageUrl
  };
};