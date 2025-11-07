// src/services/videoApi.ts
import { apiService } from './api.services';

export interface Video {
  videoId: number;
  userId: number;
  title: string;
  description?: string | null;
  originalFilename: string;
  filename: string;
  videoPath: string;
  thumbnailPath?: string | null;
  fileSize: number;
  mimeType: string;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  bitrate?: number | null;
  codec?: string | null;
  isFavorite: boolean;
  isPublic: boolean;
  uploadDate?: string;
  recordedDate?: string | null;
  location?: string | null;
  createdAt: string;
}

export interface VideoStats {
  totalVideos: number;
  favoriteVideos: number;
  deletedVideos: number;
  totalSize: number;
  activeSize: number;
  totalSizeMB: string;
  activeSizeMB: string;
  totalDuration: number;
  avgDuration: number;
  lastUpload: string;
}

export interface VideosResponse {
  success: boolean;
  data: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VideoResponse {
  success: boolean;
  data: Video;
}

export interface StatsResponse {
  success: boolean;
  data: VideoStats;
}

export const videoApi = {
  // Obtener videos del usuario
  getUserVideos: (page = 1, limit = 20, favoritesOnly = false): Promise<VideosResponse> => 
    apiService.get(`/videos?page=${page}&limit=${limit}&favorites=${favoritesOnly}`),
  
  // Obtener estadísticas de videos
  getVideoStats: (): Promise<StatsResponse> => 
    apiService.get('/videos/stats'),
  
  // Subir video
  uploadVideo: (formData: FormData): Promise<any> => 
    apiService.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Obtener video por ID
  getVideoById: (id: number): Promise<VideoResponse> => 
    apiService.get(`/videos/${id}`),
  
  // Eliminar video
  deleteVideo: (id: number): Promise<any> => 
    apiService.delete(`/videos/${id}`),
  
  // Marcar como favorito
  toggleFavorite: (id: number): Promise<any> => 
    apiService.patch(`/videos/${id}/favorite`),
  
  // Actualizar título
  updateTitle: (id: number, title: string): Promise<any> => 
    apiService.patch(`/videos/${id}/title`, { title }),
  
  // Obtener videos recientes
  getRecentVideos: (limit = 10): Promise<VideosResponse> => 
    apiService.get(`/videos/recent?limit=${limit}`)
};