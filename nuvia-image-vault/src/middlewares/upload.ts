// middlewares/upload.ts - VERSIÓN CORREGIDA
import { UploadFile, FileType, UploadConfig } from "@/types/upload";

// Configuraciones por tipo de archivo
export const UPLOAD_CONFIGS: Record<string, UploadConfig> = {
  images: {
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic'
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: "Soporta: JPG, PNG, GIF, WebP (Máx. 50MB)",
    acceptString: "image/*"
  },
  videos: {
    allowedTypes: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/avi',
      'video/mkv'
    ],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    description: "Soporta: MP4, WebM, MOV, AVI (Máx. 2GB)",
    acceptString: "video/*"
  },
  documents: {
    allowedTypes: [
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
      'application/gzip'
    ],
    maxSize: 100 * 1024 * 1024, // 100MB
    description: "Soporta: PDF, Word, Excel, PowerPoint, ZIP, TXT (Máx. 100MB)",
    acceptString: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html,.css,.js,.md"
  },
  all: {
    allowedTypes: [],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    description: "Soporta: JPG, PNG, GIF, WebP, MP4, WebM, PDF, Word, Excel, PowerPoint, ZIP, TXT",
    acceptString: "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html,.css,.js,.md"
  }
};

// Helper para obtener configuración
export const getUploadConfig = (type: string = 'all'): UploadConfig => {
  const config = { ...UPLOAD_CONFIGS[type] }; // Crear copia
  if (type === 'all') {
    config.allowedTypes = [
      ...UPLOAD_CONFIGS.images.allowedTypes,
      ...UPLOAD_CONFIGS.videos.allowedTypes,
      ...UPLOAD_CONFIGS.documents.allowedTypes
    ];
  }
  return config;
};

// Determinar tipo de archivo
export const getFileType = (file: File): FileType => {
  if (file.type.startsWith("image/")) return 'image';
  if (file.type.startsWith("video/")) return 'video';
  return 'document';
};

// Validar tipo de archivo
export const isFileTypeAllowed = (file: File, type: string = 'all'): boolean => {
  const config = getUploadConfig(type);
  return config.allowedTypes.includes(file.type);
};

// Validar tamaño de archivo
export const isFileSizeValid = (file: File, fileType: FileType): boolean => {
  const config = UPLOAD_CONFIGS[fileType] || UPLOAD_CONFIGS.all;
  return file.size <= config.maxSize;
};

// Formatear tamaño de archivo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

// ✅ CORRECCIÓN: Endpoints ACTUALIZADOS según tu configuración de rutas
export const getUploadEndpoint = (fileType: FileType): string => {
  const baseURL = "http://localhost:3000";
  
  // Según tu error "404 Not Found" para /api/upload/video
  // y tu configuración de Multer, usa estas rutas:
  switch (fileType) {
    case 'image':
      return `${baseURL}/api/images/upload`; // Ruta específica para imágenes
    case 'video':
      return `${baseURL}/api/videos/upload`; // Ruta específica para videos
    case 'document':
      return `${baseURL}/api/documents/upload`; // Ruta específica para documentos
    default:
      return `${baseURL}/api/upload`; // Ruta genérica
  }
};

// ✅ CORRECCIÓN: Función para probar endpoints y encontrar el correcto
export const findWorkingEndpoint = async (file: File, fileType: FileType): Promise<string> => {
  const token = localStorage.getItem("authToken");
  if (!token) throw new Error("No hay sesión activa");

  const endpoints = [
    // Rutas específicas (las más probables según tu Multer)
    `/api/${fileType}s/upload`,                    // /api/images/upload, /api/videos/upload, /api/documents/upload
    `/api/upload/${fileType}`,                     // /api/upload/image, /api/upload/video, /api/upload/document
    `/api/upload/${fileType}s`,                    // /api/upload/images, /api/upload/videos, /api/upload/documents
    `/api/upload`,                                 // Ruta genérica
  ];

  for (const endpoint of endpoints) {
    try {
      const formData = new FormData();
      const fieldName = fileType; // 'image', 'video', o 'document'
      formData.append(fieldName, file);
      
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.status !== 404) {
        console.log(`✅ Endpoint ${endpoint} responde (${response.status})`);
        return endpoint;
      }
    } catch (error) {
      console.log(`❌ Error probando ${endpoint}:`, error.message);
    }
  }

  throw new Error(`No se encontró un endpoint funcionando para ${fileType}`);
};

// ✅ CORRECCIÓN: Preparar FormData para upload - VERSIÓN MEJORADA
export const prepareFormData = (file: File, fileType: FileType): FormData => {
  const formData = new FormData();
  
  // ✅ USAR EL NOMBRE DE CAMPO CORRECTO SEGÚN TU MULTER
  // Tu Multer espera específicamente estos nombres de campo:
  switch (fileType) {
    case 'image':
      formData.append('image', file); // ← Multer espera 'image' para imágenes
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("category", "upload");
      break;
    
    case 'video':
      formData.append('video', file); // ← Tu Multer solo acepta 'video' para videos
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("description", "Uploaded via UploadZone");
      break;
    
    case 'document':
      // ✅ Tu Multer acepta 'document' O 'file' para documentos
      formData.append('document', file); // Campo principal
      const title = file.name.replace(/\.[^/.]+$/, "");
      formData.append("title", title);
      formData.append("category", "other");
      // También puedes incluir un campo 'file' como respaldo
      formData.append('file', file);
      break;
    
    default:
      formData.append('file', file); // Fallback genérico
  }
  
  // Debug: mostrar todos los campos del FormData
  console.log(`📦 FormData preparado para ${fileType}:`);
  console.log(`📋 Archivo: ${file.name} (${formatFileSize(file.size)})`);
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value instanceof File ? `[File: ${(value as File).name}]` : value);
  }
  
  return formData;
};

// ✅ CORRECCIÓN: Manejar mejor los nombres de campo alternativos
export const prepareFormDataWithFallback = (file: File, fileType: FileType): FormData => {
  const formData = new FormData();
  
  // Nombres de campo principales según el tipo
  const mainField = fileType; // 'image', 'video', o 'document'
  const alternativeFields = ['file', 'upload', 'media'];
  
  // Agregar el campo principal
  formData.append(mainField, file);
  
  // También agregar campos alternativos como respaldo
  // (algunos backends pueden esperar diferentes nombres)
  alternativeFields.forEach(field => {
    formData.append(field, file);
  });
  
  // Metadatos comunes
  formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
  formData.append("originalName", file.name);
  formData.append("mimeType", file.type);
  formData.append("size", file.size.toString());
  
  // Metadatos específicos por tipo
  switch (fileType) {
    case 'image':
      formData.append("category", "upload");
      break;
    case 'video':
      formData.append("description", "Uploaded via UploadZone");
      break;
    case 'document':
      formData.append("category", "other");
      // Para documentos, también intentar con nombre específico
      formData.append("document", file);
      break;
  }
  
  return formData;
};

// Validar respuesta del servidor
export const validateServerResponse = (response: any): boolean => {
  return (
    response.success === true ||
    response.status === 'success' ||
    response.id !== undefined ||
    response.documentId !== undefined ||
    response.imageId !== undefined ||
    response.videoId !== undefined ||
    response.fileId !== undefined ||
    response.message?.includes('success') ||
    response.message?.includes('subido') ||
    response.message?.includes('upload')
  );
};

// ✅ CORRECCIÓN: Manejar errores de servidor MEJORADO
export const handleServerError = (xhr: XMLHttpRequest): string => {
  let errorMessage = `Error ${xhr.status}: ${xhr.statusText}`;
  
  try {
    if (xhr.responseText) {
      const errorResponse = JSON.parse(xhr.responseText);
      console.error('❌ Respuesta de error del servidor:', errorResponse);
      
      errorMessage = errorResponse.error || 
                    errorResponse.message || 
                    errorResponse.details || 
                    errorMessage;
      
      if (errorMessage.includes("Unexpected field")) {
        // ✅ Dar información más específica sobre el error
        errorMessage = `Error de campo: El servidor espera un nombre de campo diferente. 
                       Intenta cambiar el nombre del campo en el FormData. 
                       Error original: ${errorMessage}`;
      }
      
      if (xhr.status === 404) {
        errorMessage = `Endpoint no encontrado (404). Ruta: ${errorResponse.path || 'desconocida'}. 
                       Verifica que el endpoint exista en el servidor.`;
      }
    }
  } catch (e) {
    console.error('❌ No se pudo parsear la respuesta de error:', e);
  }
  
  return errorMessage;
};

// ✅ NUEVO: Función para obtener información de debug
export const getDebugInfo = (file: File, fileType: FileType, endpoint: string) => {
  return {
    archivo: {
      nombre: file.name,
      tipo: file.type,
      tamaño: formatFileSize(file.size),
      tipoDetectado: fileType
    },
    endpoint: endpoint,
    camposEsperados: {
      image: ['image', 'file'],
      video: ['video'], // Tu Multer solo acepta 'video'
      document: ['document', 'file']
    }[fileType],
    timestamp: new Date().toISOString()
  };
};

// ✅ NUEVO: Validar el archivo completo antes de subir
export const validateFileBeforeUpload = (file: File, uploadType: string = 'all'): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validar tipo
  if (!isFileTypeAllowed(file, uploadType)) {
    errors.push(`Tipo de archivo no permitido: ${file.type}`);
  }
  
  // Validar tamaño
  const fileType = getFileType(file);
  if (!isFileSizeValid(file, fileType)) {
    const config = UPLOAD_CONFIGS[fileType];
    const maxSizeMB = config.maxSize / 1024 / 1024;
    errors.push(`Tamaño máximo excedido: ${formatFileSize(file.size)} > ${maxSizeMB}MB permitidos`);
  }
  
  // Validar nombre
  if (file.name.length > 255) {
    errors.push("Nombre de archivo demasiado largo (máx. 255 caracteres)");
  }
  
  // Validar caracteres en nombre
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(file.name)) {
    errors.push("Nombre contiene caracteres inválidos: < > : \" / \\ | ? *");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ✅ NUEVO: Crear UploadFile desde File
export const createUploadFile = (file: File): UploadFile => {
  return {
    id: Math.random().toString(36).substr(2, 9),
    file,
    progress: 0,
    status: "uploading" as const
  };
};

// ✅ NUEVO: Función helper para subir archivo (para usar en otros componentes)
export const uploadFile = async (
  file: File, 
  onProgress?: (progress: number) => void,
  onComplete?: (response: any) => void,
  onError?: (error: string) => void
): Promise<any> => {
  try {
    const fileType = getFileType(file);
    const endpoint = getUploadEndpoint(fileType);
    const formData = prepareFormData(file, fileType);
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      throw new Error("No hay sesión activa");
    }
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      });
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (validateServerResponse(response)) {
              if (onComplete) onComplete(response);
              resolve(response);
            } else {
              const error = new Error(response.error || "Error en la respuesta del servidor");
              if (onError) onError(error.message);
              reject(error);
            }
          } catch (e) {
            const error = new Error("Error procesando respuesta del servidor");
            if (onError) onError(error.message);
            reject(error);
          }
        } else {
          const errorMessage = handleServerError(xhr);
          const error = new Error(errorMessage);
          if (onError) onError(errorMessage);
          reject(error);
        }
      };
      
      xhr.onerror = () => {
        const error = new Error("Error de red al conectar con el servidor");
        if (onError) onError(error.message);
        reject(error);
      };
      
      xhr.open("POST", endpoint);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  } catch (error: any) {
    const errorMessage = error.message || "Error desconocido al subir archivo";
    if (onError) onError(errorMessage);
    throw error;
  }
};