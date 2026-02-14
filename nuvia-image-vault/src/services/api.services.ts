import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, buildUrl } from '@/config/api.config';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

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

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn('⚠️ No hay token disponible');
        }
        
        // ✅ Si es FormData, NO establecer Content-Type (axios lo hace automáticamente)
        if (config.data instanceof FormData) {
          console.log('📦 Detectado FormData, dejando que axios maneje Content-Type');
          // Axios automáticamente establece 'multipart/form-data' con el boundary correcto
          delete config.headers['Content-Type'];
        }
        
        return config;
      },
      (error) => {
        console.error('❌ [API Request Error]', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        console.error(`❌ [API Error] ${error.config?.url}`, {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              console.log('🔄 Intentando refrescar token...');
              const response = await axios.post(
                buildUrl(API_CONFIG.ENDPOINTS.AUTH.REFRESH),
                { refreshToken }
              );
              
              const { token } = response.data;
              localStorage.setItem('authToken', token);
              
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ Error al refrescar token:', refreshError);
            this.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private clearAuth(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }


  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(endpoint, config);
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data.data || response.data,
        error: response.data.error,
        status: response.status
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error de conexión',
        status: error.response?.status || 500
      };
    }
  }


  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      // ✅ Si data es FormData, no establecer Content-Type manualmente
      const requestConfig = { ...config };
      if (data instanceof FormData) {
        console.log('📦 POST con FormData detectado');
        // Axios manejará automáticamente el Content-Type con boundary
        if (requestConfig.headers) {
          delete requestConfig.headers['Content-Type'];
        }
      }

      const response: AxiosResponse = await this.axiosInstance.post(endpoint, data, requestConfig);
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data.data || response.data,
        error: response.data.error,
        status: response.status
      };
    } catch (error: any) {
      console.error('❌ [POST Error]', {
        endpoint,
        status: error.response?.status,
        error: error.response?.data,
        message: error.message
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error de conexión',
        status: error.response?.status || 500
      };
    }
  }

  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.put(endpoint, data, config);
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data.data || response.data,
        error: response.data.error,
        status: response.status
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error de conexión',
        status: error.response?.status || 500
      };
    }
  }


  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.patch(endpoint, data, config);
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data.data || response.data,
        error: response.data.error,
        status: response.status
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error de conexión',
        status: error.response?.status || 500
      };
    }
  }

  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.axiosInstance.delete(endpoint, config);
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data.data || response.data,
        error: response.data.error,
        status: response.status
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error de conexión',
        status: error.response?.status || 500
      };
    }
  }

  // ✅ MÉTODO uploadFile MEJORADO
  async uploadFile<T = any>(
    endpoint: string, 
    file: File, 
    fieldName: string = 'file',
    additionalData?: Record<string, any>,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<T>> {
    try {
      console.log('📤 [uploadFile] Preparando subida:', {
        endpoint,
        fileName: file.name,
        fileType: file.type,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fieldName
      });

      const formData = new FormData();
      formData.append(fieldName, file);
      
      if (additionalData) {
        Object.keys(additionalData).forEach(key => {
          const value = additionalData[key];
          if (Array.isArray(value)) {
            value.forEach(item => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, value);
          }
        });
      }

      // ✅ NO establecer Content-Type - axios lo hace automáticamente con boundary
      const response: AxiosResponse = await this.axiosInstance.post(endpoint, formData, {
        onUploadProgress,
        // NO incluir headers de Content-Type
      });
      
      console.log('✅ [uploadFile] Subida exitosa');
      
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data.data || response.data,
        error: response.data.error,
        status: response.status
      };
    } catch (error: any) {
      console.error('❌ [uploadFile] Error:', {
        status: error.response?.status,
        error: error.response?.data,
        message: error.message
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error de conexión',
        status: error.response?.status || 500
      };
    }
  }
}

export const apiService = new ApiService();