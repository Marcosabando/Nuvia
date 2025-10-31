import { apiService } from "./api.service";
import { API_CONFIG, validateVideoSize, validateVideoFormat, getVideoUrl } from "../config/api.config";

export interface VideoUploadData {
  title?: string;
  description?: string;
  tags?: string[];
  albumId?: number;
  categoryId?: number;
}

export interface VideoResponse {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  duration?: number;
  mimeType: string;
  userId: number;
  albumId?: number;
  categoryId?: number;
  createdAt: string;
  updatedAt: string;
}

export class VideoService {
  /**
   * Subir un video con validaciones
   */ 
  static async upload(
    file: File, 
    data?: VideoUploadData,
    onProgress?: (progress: number) => void
  ): Promise<VideoResponse> {
    // Validar tamaño
    const sizeValidation = validateVideoSize(file);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    } 
    // Validar formato
    const formatValidation = validateVideoFormat(file);
    if (!formatValidation.valid) {
      throw new Error(formatValidation.error);
    }
    try {
      const response = await apiService.uploadFile<VideoResponse>(
        API_CONFIG.ENDPOINTS.VIDEOS.UPLOAD,
        file,
        data,
        (progressEvent) => {  
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      );
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al subir el video');
    } 
  }
  /**
   * Obtener todos los videos
   */
  static async getAll(): Promise<VideoResponse[]> {
    try {
      return await apiService.get<VideoResponse[]>(API_CONFIG.ENDPOINTS.VIDEOS.BASE);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener videos');
    }
  }
  /**
   * Obtener video por ID
   */
  static async getById(id: number): Promise<VideoResponse> {
    try {
      return await apiService.get<VideoResponse>(API_CONFIG.ENDPOINTS.VIDEOS.BY_ID(id)); 
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener el video');
    }
  }

  /**
   * Obtener videos por usuario
   */
  static async getByUser(userId: number): Promise<VideoResponse[]> {
    try {
      return await apiService.get<VideoResponse[]>(API_CONFIG.ENDPOINTS.VIDEOS.BY_USER(userId));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener videos del usuario');
    }
  }

  /**
   * Eliminar video por ID
   */
  static async delete(id: number): Promise<void> {
    try {
      await apiService.delete(API_CONFIG.ENDPOINTS.VIDEOS.BY_ID(id));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al eliminar el video');
    }
  }

  /**
   * Generar URL completa para un video
   */
  static getVideoUrl(path: string): string {
    return getVideoUrl(path);
  }
}