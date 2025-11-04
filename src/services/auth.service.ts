
import { apiService } from './api.service';
import { API_CONFIG } from '@/config/api.config';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginTestCredentials {
  userId: number;
  email: string;
  username: string;
}

interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  expiresIn?: string;
  user: {
    userId: number;
    email: string;
    username: string;
  };
}

interface UserProfile {
  userId: number;
  username: string;
  email: string;
  emailVerified: boolean;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
}

export class AuthService {
  /**
   * Login normal
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      
      this.saveAuthData(response);
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión');
    }
  }

  /**
   * Login de prueba (para desarrollo con Postman)
   */
  static async loginTest(credentials: LoginTestCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN_TEST,
        credentials
      );
      
      this.saveAuthData(response);
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error en login de prueba');
    }
  }

  /**
   * Registro de nuevo usuario
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        data
      );
      
      this.saveAuthData(response);
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al registrar usuario');
    }
  }

  /**
   * Obtener perfil del usuario actual
   */
  static async getCurrentUser(): Promise<UserProfile> {
    try {
      return await apiService.get<UserProfile>(API_CONFIG.ENDPOINTS.AUTH.ME);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener perfil');
    }
  }

  /**
   * Logout completo
   */
  static logout(): void {
    // Limpiar todos los datos de autenticación
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    
    // También limpiar sessionStorage por si acaso
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    
    // Redirigir al login
    window.location.href = '/';
  }

  /**
   * Verifica si el usuario está autenticado
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  /**
   * Obtiene el token actual
   */
  static getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Obtiene el usuario almacenado
   */
  static getUser(): AuthResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Guarda datos de autenticación
   */
  private static saveAuthData(response: AuthResponse): void {
    if (response.token) {
      localStorage.setItem('authToken', response.token);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
  }
}
