import { apiService } from './api.services';
import { API_CONFIG, getImageUrl, validateFileSize, validateImageFormat } from '@/config/api.config';

interface ImageUploadData {
  title?: string;
  description?: string;
  albumId?: number;
  categoryId?: number;
  tags?: string[];
}

interface ImageResponse {
  id: number;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  uploadDate: string;
  userId: number;
}

export class ImageService {
  /**
   * Subir una imagen con validaciones
   */
  static async upload(
    file: File, 
    data?: ImageUploadData,
    onProgress?: (progress: number) => void
  ): Promise<ImageResponse> {
    // Validar tamaño
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    // Validar formato
    const formatValidation = validateImageFormat(file);
    if (!formatValidation.valid) {
      throw new Error(formatValidation.error);
    }

    try {
      const response = await apiService.uploadFile<ImageResponse>(
        API_CONFIG.ENDPOINTS.IMAGES.UPLOAD,
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
      throw new Error(error.response?.data?.error || 'Error al subir la imagen');
    }
  }

  /**
   * Obtener todas las imágenes
   */
  static async getAll(): Promise<ImageResponse[]> {
    try {
      return await apiService.get<ImageResponse[]>(API_CONFIG.ENDPOINTS.IMAGES.BASE);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener imágenes');
    }
  }

  /**
   * Obtener imagen por ID
   */
  static async getById(id: number): Promise<ImageResponse> {
    try {
      return await apiService.get<ImageResponse>(API_CONFIG.ENDPOINTS.IMAGES.BY_ID(id));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener imagen');
    }
  }

  /**
   * Obtener imágenes por usuario
   */
  static async getByUser(userId: number): Promise<ImageResponse[]> {
    try {
      return await apiService.get<ImageResponse[]>(API_CONFIG.ENDPOINTS.IMAGES.BY_USER(userId));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener imágenes del usuario');
    }
  }

  /**
   * Obtener imágenes por álbum
   */
  static async getByAlbum(albumId: number): Promise<ImageResponse[]> {
    try {
      return await apiService.get<ImageResponse[]>(API_CONFIG.ENDPOINTS.IMAGES.BY_ALBUM(albumId));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener imágenes del álbum');
    }
  }

  /**
   * Buscar imágenes
   */
  static async search(query: string): Promise<ImageResponse[]> {
    try {
      return await apiService.get<ImageResponse[]>(
        `${API_CONFIG.ENDPOINTS.IMAGES.SEARCH}?q=${encodeURIComponent(query)}`
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al buscar imágenes');
    }
  }

  /**
   * Actualizar imagen
   */
  static async update(id: number, data: Partial<ImageUploadData>): Promise<ImageResponse> {
    try {
      return await apiService.patch<ImageResponse>(
        API_CONFIG.ENDPOINTS.IMAGES.BY_ID(id),
        data
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al actualizar imagen');
    }
  }

  /**
   * Eliminar imagen
   */
  static async delete(id: number): Promise<void> {
    try {
      await apiService.delete(API_CONFIG.ENDPOINTS.IMAGES.BY_ID(id));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al eliminar imagen');
    }
  }

  /**
   * Obtener URL completa de una imagen
   */
  static getImageUrl(filename: string): string {
    return getImageUrl(filename);
  }
}