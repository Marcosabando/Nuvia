import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, buildUrl } from '@/config/api.config';

/**
 * Servicio HTTP centralizado con interceptores
 */
class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.DEFAULT_HEADERS,
    });

    this.setupInterceptors();
  }

  /**
   * Configura interceptores de request y response
   */
  private setupInterceptors(): void {
    // Request interceptor - Agrega token JWT automáticamente
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Maneja errores globalmente
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Si es error 401 y no es el endpoint de login/refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Intenta refrescar el token
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(
                buildUrl(API_CONFIG.ENDPOINTS.AUTH.REFRESH),
                { refreshToken }
              );
              
              const { token } = response.data;
              localStorage.setItem('authToken', token);
              
              // Reintenta la petición original con el nuevo token
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // Si falla el refresh, limpia tokens y redirige al login
            this.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        // Si es 403, puede ser problema de CORS o permisos
        if (error.response?.status === 403) {
          console.error('Error 403: Acceso denegado. Verifica CORS en el backend.');
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Limpia autenticación y redirige al login
   */
  private clearAuth(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  /**
   * Petición GET
   */
  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, config);
    return response.data;
  }

  /**
   * Petición POST
   */
  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, data, config);
    return response.data;
  }

  /**
   * Petición PUT
   */
  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(endpoint, data, config);
    return response.data;
  }

  /**
   * Petición PATCH
   */
  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(endpoint, data, config);
    return response.data;
  }

  /**
   * Petición DELETE
   */
  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint, config);
    return response.data;
  }

  /**
   * Upload de archivos
   */
  async uploadFile<T = any>(
    endpoint: string, 
    file: File, 
    additionalData?: Record<string, any>,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        const value = additionalData[key];
        if (Array.isArray(value)) {
          // Para arrays (como tags), agregar cada elemento
          value.forEach(item => formData.append(`${key}[]`, item));
        } else {
          formData.append(key, value);
        }
      });
    }

    const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    
    return response.data;
  }
}

// Exportar instancia única (Singleton)
export const apiService = new ApiService();