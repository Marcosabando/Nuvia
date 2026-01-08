// types/upload.ts - VERSIÓN CORREGIDA

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  errorMessage?: string;
  startTime?: number; // ✅ AGREGADO: Para calcular velocidad
}

export interface UploadZoneProps {
  onUploadComplete?: () => void;
  type?: 'all' | 'image' | 'images' | 'video' | 'videos' | 'document' | 'documents'; // ✅ CORREGIDO: Tipos consistentes
  className?: string;
  maxFileSize?: number; // ✅ AGREGADO: Para personalizar límite
  maxFiles?: number; // ✅ AGREGADO: Límite de archivos
}

export type FileType = 'image' | 'video' | 'document';

export interface UploadConfig {
  allowedTypes: string[];
  maxSize: number;
  description: string;
  acceptString: string;
  maxFiles?: number; // ✅ AGREGADO
  label?: string; // ✅ AGREGADO: Etiqueta para UI
}

export interface ServerResponse {
  success?: boolean;
  status?: string;
  id?: string;
  documentId?: string;
  imageId?: string;
  videoId?: string;
  error?: string;
  message?: string;
  filename?: string; // ✅ AGREGADO
  path?: string; // ✅ AGREGADO
  size?: number; // ✅ AGREGADO
  mimeType?: string; // ✅ AGREGADO
  thumbnail?: string; // ✅ AGREGADO para imágenes
  duration?: number; // ✅ AGREGADO para videos
  pages?: number; // ✅ AGREGADO para documentos PDF
}

// ✅ NUEVAS INTERFACES PARA MEJOR FUNCIONALIDAD

export interface UploadStats {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  inProgressFiles: number;
  totalSize: number;
  uploadedSize: number;
  averageSpeed: number;
  estimatedTimeRemaining: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileType?: FileType;
  size?: number;
}

export interface UploadProgressEvent {
  fileId: string;
  progress: number;
  loaded: number;
  total: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

// ✅ CONSTANTES PARA LÍMITES (3GB)

export const MAX_FILE_SIZES = {
  IMAGE: 3 * 1024 * 1024 * 1024, // 3GB
  VIDEO: 3 * 1024 * 1024 * 1024, // 3GB
  DOCUMENT: 3 * 1024 * 1024 * 1024, // 3GB
  DEFAULT: 3 * 1024 * 1024 * 1024, // 3GB
} as const;

export const ALLOWED_MIME_TYPES = {
  IMAGE: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff'
  ],
  VIDEO: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/avi',
    'video/mpeg',
    'video/3gpp',
    'video/3gpp2'
  ],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/rtf',
    'application/json',
    'application/xml',
    'text/html',
    'text/css',
    'application/javascript',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    'application/x-bzip2'
  ]
} as const;

// ✅ TIPOS DE ERROR ESPECÍFICOS

export type UploadErrorType = 
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'AUTH_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN_ERROR';

export interface UploadError {
  type: UploadErrorType;
  message: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  maxSize?: number;
  allowedTypes?: string[];
  statusCode?: number;
  retryable?: boolean;
}

// ✅ INTERFACES PARA CONFIGURACIÓN AVANZADA

export interface UploadOptions {
  chunkSize?: number; // Para uploads en trozos
  maxConcurrentUploads?: number;
  timeout?: number; // en milisegundos
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (event: UploadProgressEvent) => void;
  onError?: (error: UploadError) => void;
  onSuccess?: (response: ServerResponse) => void;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

// ✅ INTERFAZ PARA EL ESTADO DEL UPLOAD ZONE

export interface UploadZoneState {
  files: UploadFile[];
  stats: UploadStats;
  isUploading: boolean;
  isDragging: boolean;
  errors: UploadError[];
  totalProgress: number;
}