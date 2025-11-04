// src/config/api.config.ts

export const API_CONFIG = {
  // ⚠️ IMPORTANTE: BASE_URL NO debe incluir /api al final
  // porque los endpoints ya lo tienen
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // URL de uploads
  UPLOADS_URL: import.meta.env.VITE_UPLOADS_URL || 'http://localhost:3000/uploads',
  
  // Configuración de la app
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Nuvia',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Límites (50MB como en tu backend)
  MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '52428800'), // 50MB
  MAX_VIDEO_SIZE: parseInt(import.meta.env.VITE_MAX_VIDEO_SIZE || '104857600'), // 100MB
  
  // Formatos permitidos
  ALLOWED_IMAGE_FORMATS: (import.meta.env.VITE_ALLOWED_IMAGE_FORMATS || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  ALLOWED_VIDEO_FORMATS: (import.meta.env.VITE_ALLOWED_VIDEO_FORMATS || 'video/mp4,video/avi,video/mov,video/wmv,video/webm').split(','),
  
  // Timeout por defecto
  TIMEOUT: 30000,
  
  // Endpoints de tu API (todos empiezan con /api)
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN: '/auth/login',
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
      UPLOAD_MULTIPLE: '/images/upload-multiple',
      BY_USER: (userId: number) => `/images/user/${userId}`,
      BY_ALBUM: (albumId: number) => `/images/album/${albumId}`,
      BY_CATEGORY: (categoryId: number) => `/images/category/${categoryId}`,
      BY_TAG: (tagId: number) => `/images/tag/${tagId}`,
      SEARCH: '/images/search',
    },
    
    // Videos
    VIDEOS: {
      BASE: '/videos',
      BY_ID: (id: number) => `/videos/${id}`,
      UPLOAD: '/videos/upload',
      BY_USER: (userId: number) => `/videos/user/${userId}`,
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
      BY_ID: (id: number) => `/tags/search`,
      SEARCH: '/tags/search',
    },

    // Stats
    STATS: {
      USER: '/stats/user',
      GLOBAL: '/stats/global',
    }
  },
  
  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
};

/**
 * Construye la URL completa para un endpoint
 * @param endpoint - El endpoint que ya incluye /api (ej: '/api/auth/login')
 */
export const buildUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Obtiene la URL completa de una imagen subida
 * @param path - Puede ser solo el nombre del archivo o la ruta completa
 */
export const getImageUrl = (path: string): string => {
  if (!path) return '';
  
  // Si ya es una URL completa, retornarla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si ya incluye /uploads, construir desde BASE_URL
  if (path.startsWith('/uploads')) {
    return `${API_CONFIG.BASE_URL}${path}`;
  }
  
  // Si solo es el nombre del archivo, usar UPLOADS_URL
  return `${API_CONFIG.UPLOADS_URL}/${path.replace(/^\//, '')}`;
};

/**
 * Obtiene la URL completa de un video subido
 * @param path - Puede ser solo el nombre del archivo o la ruta completa
 */
export const getVideoUrl = (path: string): string => {
  if (!path) return '';
  
  // Si ya es una URL completa, retornarla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si ya incluye /uploads, construir desde BASE_URL
  if (path.startsWith('/uploads')) {
    return `${API_CONFIG.BASE_URL}${path}`;
  }
  
  // Si solo es el nombre del archivo, usar UPLOADS_URL
  return `${API_CONFIG.UPLOADS_URL}/${path.replace(/^\//, '')}`;
};

/**
 * Valida el tamaño de un archivo
 */
export const validateFileSize = (file: File): { valid: boolean; error?: string } => {
  if (file.size > API_CONFIG.MAX_FILE_SIZE) {
    const maxMB = (API_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${maxMB}MB`
    };
  }
  return { valid: true };
};

/**
 * Valida el tamaño de un video
 */
export const validateVideoSize = (file: File): { valid: boolean; error?: string } => {
  if (file.size > API_CONFIG.MAX_VIDEO_SIZE) {
    const maxMB = (API_CONFIG.MAX_VIDEO_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `El video es demasiado grande. Tamaño máximo: ${maxMB}MB`
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
 * Valida el formato de un video
 */
export const validateVideoFormat = (file: File): { valid: boolean; error?: string } => {
  if (!API_CONFIG.ALLOWED_VIDEO_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato de video no permitido. Use MP4, AVI, MOV, WMV o WebM'
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

// Debug en desarrollo
if (import.meta.env.DEV) {
  console.log('🔧 API Config:', {
    baseUrl: API_CONFIG.BASE_URL,
    uploadsUrl: API_CONFIG.UPLOADS_URL,
    registerEndpoint: buildUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER)
  });
}