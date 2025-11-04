export const API_CONFIG = {
  // Base URL desde variable de entorno
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  
  // URL de uploads
  UPLOADS_URL: import.meta.env.VITE_UPLOADS_URL || 'http://localhost:3000/uploads',
  
  // Configuración de la app
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Nuvia',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Límites (50MB como en tu backend)
  MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '52428800'),
  ALLOWED_IMAGE_FORMATS: (import.meta.env.VITE_ALLOWED_IMAGE_FORMATS || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  
  // Timeout por defecto
  TIMEOUT: 30000,
  
  // Endpoints de tu API
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN_TEST: '/auth/login-test',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      ME: '/auth/me',
      VERIFY_EMAIL: '/auth/verify-email',
    },
    
    // Users
    USERS: {
      BASE: '/users',
      LOGIN: '/users/login',
      BY_ID: (id: number) => `/users/${id}`,
      UPDATE_PROFILE: '/users/profile',
      CHANGE_PASSWORD: '/users/password',
      STORAGE: '/users/storage',
    },
    
    // Images
    IMAGES: {
      BASE: '/images',
      BY_ID: (id: number) => `/images/${id}`,
      UPLOAD: '/images/upload',
      BY_USER: (userId: number) => `/images/user/${userId}`,
      BY_ALBUM: (albumId: number) => `/images/album/${albumId}`,
      BY_CATEGORY: (categoryId: number) => `/images/category/${categoryId}`,
      BY_TAG: (tagId: number) => `/images/tag/${tagId}`,
      SEARCH: '/images/search',
    },
    
    // Albums
    ALBUMS: {
      BASE: '/albums',
      BY_ID: (id: number) => `/albums/${id}`,
      BY_USER: (userId: number) => `/albums/user/${userId}`,
    },
    
    // Categories
    CATEGORIES: {
      BASE: '/categories',
      BY_ID: (id: number) => `/categories/${id}`,
    },
    
    // Tags
    TAGS: {
      BASE: '/tags',
      BY_ID: (id: number) => `/tags/${id}`,
      SEARCH: '/tags/search',
    },
  },
  
  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
};

/**
 * Construye la URL completa para un endpoint
 */
export const buildUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Obtiene la URL completa de una imagen subida
 */
export const getImageUrl = (filename: string): string => {
  if (!filename) return '';
  // Si ya es una URL completa, retornarla tal cual
  if (filename.startsWith('http')) return filename;
  return `${API_CONFIG.UPLOADS_URL}/${filename}`;
};

/**
 * Valida el tamaño de un archivo
 */
export const validateFileSize = (file: File): { valid: boolean; error?: string } => {
  if (file.size > API_CONFIG.MAX_FILE_SIZE) {
    const maxMB = API_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${maxMB}MB`
    };
  }
  return { valid: true };
};

/**
 * Valida el formato de una imagen
 */
export const validateImageFormat = (file: File): { valid: boolean; error?: string } => {
  if (!API_CONFIG.ALLOWED_IMAGE_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato no permitido. Solo se aceptan JPEG, PNG, GIF y WebP'
    };
  }
  return { valid: true };
};

/**
 * Formatea el tamaño de archivo para mostrar
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};