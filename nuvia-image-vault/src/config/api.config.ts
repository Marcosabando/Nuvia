// src/config/api.config.ts - VERSIÓN CORREGIDA
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
  
  // Endpoints de tu API REAL (basado en tu backend)
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN_TEST: '/auth/login-test',
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      ME: '/auth/me',
      VERIFY: '/auth/verify',
    },
    
    // Users
    USERS: {
      BASE: '/users',
      PROFILE: '/users/profile',
      CHANGE_PASSWORD: '/users/change-password',
      ACCOUNT: '/users/account',
      LOGOUT: '/users/logout',
      VERIFY: '/users/verify',
    },
    
    // Images
    IMAGES: {
      BASE: '/images',
      BY_ID: (id: number) => `/images/${id}`,
      UPLOAD: '/images/upload',
      UPLOAD_MULTIPLE: '/images/upload-multiple',
      STATS: '/images/stats',
      SEARCH: '/images/search',
      RECENT: '/images/recent',
      FAVORITE: (id: number) => `/images/${id}/favorite`,
      TITLE: (id: number) => `/images/${id}/title`,
      DESCRIPTION: (id: number) => `/images/${id}/description`,
      TOGGLE_PUBLIC: (id: number) => `/images/${id}/toggle-public`,
    },
    
    // Videos
    VIDEOS: {
      BASE: '/videos',
      BY_ID: (id: number) => `/videos/${id}`,
      UPLOAD: '/videos/upload',
      UPLOAD_MULTIPLE: '/videos/upload-multiple',
      STATS: '/videos/stats',
      SEARCH: '/videos/search',
      RECENT: '/videos/recent',
      DELETED: '/videos/deleted',
      FAVORITE: (id: number) => `/videos/${id}/favorite`,
      TITLE: (id: number) => `/videos/${id}/title`,
      DESCRIPTION: (id: number) => `/videos/${id}/description`,
      SOFT_DELETE: (id: number) => `/videos/${id}/soft-delete`,
      RESTORE: (id: number) => `/videos/${id}/restore`,
    },
    
    // Documents
    DOCUMENTS: {
      BASE: '/documents',
      BY_ID: (id: number) => `/documents/${id}`,
      UPLOAD: '/documents/upload',
      STATS: '/documents/stats',
      SEARCH: '/documents/search',
      BY_CATEGORY: (category: string) => `/documents/category/${category}`,
      FILE: (id: number) => `/documents/${id}/file`,
      DOWNLOAD: (id: number) => `/documents/${id}/download`,
      PREVIEW: (id: number) => `/documents/${id}/preview`,
      PREVIEW_URL: (id: number) => `/documents/${id}/preview-url`,
      OPEN: (id: number) => `/documents/${id}/open`,
      FAVORITE: (id: number) => `/documents/${id}/favorite`,
    },
    
    // Folders
    FOLDERS: {
      BASE: '/folders',
      BY_ID: (id: number) => `/folders/${id}`,
      CONTENT: (id: number) => `/folders/${id}/content`,
      IMAGES: (folderId: number, imageId: number) => `/folders/${folderId}/images/${imageId}`,
      VIDEOS: (folderId: number, videoId: number) => `/folders/${folderId}/videos/${videoId}`,
    },
    
    // Profile
    PROFILE: {
      BASE: '/profile',
      STATS: '/profile/stats',
      IMAGE: '/profile/image',
      USERNAME: '/profile/username',
      EMAIL: '/profile/email',
      BIO: '/profile/bio',
      LOCATION: '/profile/location',
      PASSWORD: '/profile/password',
      THEME: '/profile/theme',
      LANGUAGE: '/profile/language',
    },
    
    // Stats
    STATS: {
      BASE: '/stats',
      RECENT: '/stats/recent',
    },
    
    // Trash
    TRASH: {
      BASE: '/trash',
      STATS: '/trash/stats',
      EMPTY: '/trash/empty',
      RESTORE_MULTIPLE: '/trash/restore-multiple',
      RESTORE: (id: number) => `/trash/${id}/restore`,
    },
    
    // Recents
    RECENTS: {
      BASE: '/recents',
      STATS: '/recents/stats',
      IMAGES: '/recents/images',
      VIDEOS: '/recents/videos',
      TIMELINE: '/recents/timeline',
      MOST_VIEWED: '/recents/most-viewed',
    },
    
    // Admin
    ADMIN: {
      BASE: '/admin',
      STATS: '/admin/stats',
      ACTIVITY: '/admin/activity',
      USERS: '/admin/users',
      USER_DETAILS: (id: number) => `/admin/users/${id}`,
      SUSPEND: (id: number) => `/admin/users/${id}/suspend`,
      STORAGE: (id: number) => `/admin/users/${id}/storage`,
      SEARCH: '/admin/search',
      EXPORT: '/admin/export',
      VERIFY: '/admin/verify',
    },
    
    // System
    SYSTEM: {
      DISKS: '/api/system/disks',
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
  
  // Si es una ruta relativa, añadir base URL
  if (filename.startsWith('/')) {
    return `${API_CONFIG.UPLOADS_URL}${filename}`;
  }
  
  return `${API_CONFIG.UPLOADS_URL}/${filename}`;
};

/**
 * Obtiene la URL de un video
 */
export const getVideoUrl = (userId: number, filename: string): string => {
  return `${API_CONFIG.BASE_URL}/video/${userId}/${filename}`;
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