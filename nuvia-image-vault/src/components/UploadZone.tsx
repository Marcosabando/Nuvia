import { useState, useCallback, useEffect } from "react";
import { Upload, Image, X, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  // Tipos MIME permitidos para documentos
  const allowedDocumentTypes = [
    // PDF
    'application/pdf',
    
    // Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Texto
    'text/plain',
    'text/csv',
    'text/markdown',
    
    // Otros documentos
    'application/rtf',
    'application/json',
    'application/xml',
    'text/html',
    'text/css',
    'application/javascript',
    
    // Archivos comprimidos
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip'
  ];

  const isDocumentFile = (file: File): boolean => {
    return allowedDocumentTypes.includes(file.type);
  };

  const isImageFile = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  const isVideoFile = (file: File): boolean => {
    return file.type.startsWith("video/");
  };

  const getFileType = (file: File): 'image' | 'video' | 'document' => {
    if (isImageFile(file)) return 'image';
    if (isVideoFile(file)) return 'video';
    if (isDocumentFile(file)) return 'document';
    return 'document'; // Por defecto
  };

  const getUploadEndpoint = (fileType: 'image' | 'video' | 'document'): string => {
    switch (fileType) {
      case 'image':
        return "http://localhost:3000/api/images/upload";
      case 'video':
        return "http://localhost:3000/api/videos/upload";
      case 'document':
        return "http://localhost:3000/api/documents/upload";
      default:
        return "http://localhost:3000/api/documents/upload";
    }
  };

  // Función para determinar el nombre del campo según el tipo de archivo
  const getFieldName = (fileType: 'image' | 'video' | 'document'): string => {
    switch (fileType) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'document':
        return 'document';
      default:
        return 'file';
    }
  };

  const uploadToServer = useCallback(
    async (uploadFile: UploadFile) => {
      try {
        console.log("📤 Subiendo archivo:", uploadFile.file.name);

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No hay sesión activa. Por favor, inicia sesión nuevamente.");
        }

        // Determinar tipo de archivo y endpoint
        const fileType = getFileType(uploadFile.file);
        const endpoint = getUploadEndpoint(fileType);
        const fieldName = getFieldName(fileType);

        console.log("🎯 Subiendo a endpoint:", endpoint);
        console.log("📝 Usando campo:", fieldName);

        // Crear FormData - PRUEBA CON DIFERENTES ENFOQUES
        const formData = new FormData();
        
        // PRIMER INTENTO: Solo el archivo básico
        formData.append(fieldName, uploadFile.file);
        
        // SEGUNDO INTENTO: Agregar metadata adicional SOLO para documentos
        if (fileType === 'document') {
          const title = uploadFile.file.name.replace(/\.[^/.]+$/, ""); // Remover extensión
          formData.append("title", title);
          formData.append("category", "other");
          formData.append("description", `Archivo subido: ${uploadFile.file.name}`);
          
          // DEBUG: Agregar información adicional para debugging
          formData.append("originalName", uploadFile.file.name);
          formData.append("fileSize", uploadFile.file.size.toString());
          formData.append("mimeType", uploadFile.file.type);
        }

        // DEBUG: Mostrar los campos del FormData
        console.log("📋 Campos en FormData:");
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
        }

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);
              setUploadingFiles((prev) =>
                prev.map((file) => (file.id === uploadFile.id ? { ...file, progress } : file))
              );
            }
          });

          xhr.addEventListener("load", () => {
            console.log("📨 Respuesta del servidor:", {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText,
            });

            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                console.log("✅ Respuesta JSON:", response);

                // VERIFICACIÓN MEJORADA: Aceptar diferentes estructuras de respuesta
                const isSuccess = 
                  response.success === true || 
                  response.status === 'success' || 
                  response.id !== undefined ||
                  response.documentId !== undefined ||
                  response.imageId !== undefined ||
                  response.videoId !== undefined;

                if (isSuccess) {
                  setUploadingFiles((prev) =>
                    prev.map((file) => {
                      if (file.id === uploadFile.id) {
                        return { ...file, progress: 100, status: "completed" };
                      }
                      return file;
                    })
                  );

                  toast({
                    title: "✅ Subida completada",
                    description: `${uploadFile.file.name} se subió correctamente`,
                  });

                  // Llamar callback para recargar contenido
                  if (onUploadComplete) {
                    onUploadComplete();
                  }

                  resolve(response);
                } else {
                  // El servidor respondió OK pero con error en la lógica
                  const errorMessage = response.error || response.message || `Error al guardar el ${fileType}`;
                  console.error("❌ Error en respuesta del servidor:", errorMessage);
                  reject(new Error(errorMessage));
                }
              } catch (parseError) {
                console.error("❌ Error al parsear respuesta:", parseError);
                // Si no se puede parsear como JSON pero el status es 200, considerar como éxito
                if (xhr.responseText && xhr.responseText.includes("success")) {
                  setUploadingFiles((prev) =>
                    prev.map((file) => {
                      if (file.id === uploadFile.id) {
                        return { ...file, progress: 100, status: "completed" };
                      }
                      return file;
                    })
                  );

                  toast({
                    title: "✅ Subida completada",
                    description: `${uploadFile.file.name} se subió correctamente`,
                  });

                  if (onUploadComplete) {
                    onUploadComplete();
                  }

                  resolve({ success: true });
                } else {
                  reject(new Error("Error al procesar la respuesta del servidor"));
                }
              }
            } else {
              // Error HTTP
              let errorMessage = `Error ${xhr.status}: ${xhr.statusText}`;
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.error || errorResponse.message || errorMessage;
                console.log("❌ Error detallado:", errorResponse);
                
                // MANEJO ESPECÍFICO PARA ERROR 400 "Información del archivo incompleta"
                if (errorResponse.error === "Información del archivo incompleta") {
                  errorMessage = "El servidor no recibió la información completa del archivo. ";
                  errorMessage += "Probando método alternativo...";
                  
                  // Intentar método alternativo
                  setTimeout(() => {
                    uploadAlternativeMethod(uploadFile, fileType, fieldName)
                      .then(resolve)
                      .catch(reject);
                  }, 1000);
                  return;
                }
              } catch (e) {
                console.log("❌ Error sin JSON:", xhr.responseText);
              }
              reject(new Error(errorMessage));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Error de red al conectar con el servidor"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Subida cancelada"));
          });

          // Configurar y enviar la petición
          xhr.open("POST", endpoint);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      } catch (error: any) {
        console.error("❌ Error completo subiendo archivo:", error);

        let errorMessage = `No se pudo subir ${uploadFile.file.name}`;

        if (error.message?.includes("Unexpected field")) {
          errorMessage = "Error de configuración: El servidor no reconoce el campo del archivo. Contacta al administrador.";
        } else if (error.message?.includes("401")) {
          errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente.";
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } else if (error.message?.includes("413")) {
          errorMessage = "El archivo es demasiado grande";
        } else if (error.message?.includes("500")) {
          errorMessage = "Error interno del servidor al procesar el archivo";
        } else if (error.message?.includes("404")) {
          errorMessage = "Servicio no disponible. Ruta no encontrada.";
        } else {
          errorMessage = error.message || errorMessage;
        }

        setUploadingFiles((prev) =>
          prev.map((file) => {
            if (file.id === uploadFile.id) {
              return { ...file, status: "error" };
            }
            return file;
          })
        );

        toast({
          title: "❌ Error en la subida",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast, onUploadComplete]
  );

  // MÉTODO ALTERNATIVO para cuando falla el principal
  const uploadAlternativeMethod = async (uploadFile: UploadFile, fileType: string, fieldName: string) => {
    console.log("🔄 Probando método alternativo para:", uploadFile.file.name);
    
    const token = localStorage.getItem("authToken");
    const endpoint = getUploadEndpoint(fileType as any);

    // FormData simplificado - solo lo esencial
    const formData = new FormData();
    formData.append(fieldName, uploadFile.file);
    
    // Para documentos, solo el título mínimo
    if (fileType === 'document') {
      const title = uploadFile.file.name.replace(/\.[^/.]+$/, "");
      formData.append("title", title);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const result = await response.json();
      
      if (response.ok && (result.success || result.id || result.documentId)) {
        setUploadingFiles((prev) =>
          prev.map((file) => {
            if (file.id === uploadFile.id) {
              return { ...file, progress: 100, status: "completed" };
            }
            return file;
          })
        );

        toast({
          title: "✅ Subida completada",
          description: `${uploadFile.file.name} se subió correctamente (método alternativo)`,
        });

        if (onUploadComplete) {
          onUploadComplete();
        }

        return result;
      } else {
        throw new Error(result.error || "Error en método alternativo");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleFiles = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) => 
        isImageFile(file) || isVideoFile(file) || isDocumentFile(file)
      );

      if (validFiles.length !== files.length) {
        const invalidCount = files.length - validFiles.length;
        toast({
          title: "Archivos no válidos",
          description: `${invalidCount} archivo(s) no son válidos. Solo se permiten imágenes, videos y documentos.`,
          variant: "destructive",
        });
      }

      if (validFiles.length === 0) return;

      // Verificar tamaño (100MB máximo para documentos, 3GB para multimedia)
      const oversizedFiles = validFiles.filter((file) => {
        const fileType = getFileType(file);
        const maxSize = fileType === 'document' ? 100 * 1024 * 1024 : 3 * 1024 * 1024 * 1024;
        return file.size > maxSize;
      });

      if (oversizedFiles.length > 0) {
        toast({
          title: "Archivos demasiado grandes",
          description: "El tamaño máximo es 100MB para documentos y 3GB para multimedia",
          variant: "destructive",
        });
        return;
      }

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        progress: 0,
        status: "uploading",
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadFiles]);

      // Subir archivos
      newUploadFiles.forEach((uploadFile) => {
        uploadToServer(uploadFile);
      });
    },
    [toast, uploadToServer]
  );

  const removeUploadFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const fileType = getFileType(file);
    switch (fileType) {
      case 'image':
        return <Image className="w-6 h-6 text-nuvia-mauve" />;
      case 'video':
        return (
          <div className="w-6 h-6 bg-nuvia-mauve rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">VID</span>
          </div>
        );
      case 'document':
        return <FileText className="w-6 h-6 text-nuvia-mauve" />;
      default:
        return <FileText className="w-6 h-6 text-nuvia-mauve" />;
    }
  };

  const getFileTypeLabel = (file: File): string => {
    const fileType = getFileType(file);
    switch (fileType) {
      case 'image':
        return 'Imagen';
      case 'video':
        return 'Video';
      case 'document':
        return 'Documento';
      default:
        return 'Archivo';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card
        className={`border-2 border-dashed transition-all duration-300 ${
          dragActive ? "border-nuvia-rose bg-nuvia-rose/10" : "border-nuvia-peach/30 hover:border-nuvia-mauve/50"
        } rounded-2xl shadow-nuvia-soft`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}>
        <CardContent className="p-6 md:p-8 lg:p-12 text-center">
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-nuvia-peach/20 to-nuvia-rose/20 flex items-center justify-center mb-4 md:mb-6 shadow-nuvia-glow">
            <Upload className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-nuvia-mauve" />
          </div>

          <h3 className="text-lg md:text-xl font-semibold mb-2 text-nuvia-deep">Arrastra tus archivos aquí</h3>
          <p className="text-sm md:text-base text-nuvia-deep/70 mb-4 md:mb-6 px-4">
            O haz clic para buscar y seleccionar archivos de tu dispositivo
          </p>

          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html,.css,.js,.md"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />

          <label htmlFor="file-input">
            <Button
              className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:from-nuvia-rose hover:to-nuvia-peach text-white shadow-nuvia-strong hover:shadow-nuvia-glow transition-all duration-300"
              asChild>
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Elegir archivos
              </span>
            </Button>
          </label>

          <p className="text-xs text-nuvia-deep/50 mt-3 md:mt-4">
            Soporta: JPG, PNG, GIF, WebP, MP4, MOV, PDF, Word, Excel, PowerPoint, ZIP, TXT (Máx. 100MB documentos, 3GB multimedia)
          </p>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card className="border border-nuvia-peach/30 bg-white/50 backdrop-blur-sm rounded-2xl shadow-nuvia-soft">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2 text-nuvia-deep">
              <Upload className="w-5 h-5 text-nuvia-mauve" />
              Subiendo archivos ({uploadingFiles.length})
            </h4>

            <div className="space-y-4">
              {uploadingFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
                    uploadFile.status === "completed"
                      ? "bg-green-50 border border-green-200"
                      : uploadFile.status === "error"
                      ? "bg-red-50 border border-red-200"
                      : "bg-nuvia-peach/10 border border-nuvia-peach/20"
                  }`}>
                  <div className="w-12 h-12 rounded-lg bg-white border border-nuvia-peach/30 flex items-center justify-center overflow-hidden shadow-nuvia-soft">
                    {getFileType(uploadFile.file) === 'image' ? (
                      <img
                        src={URL.createObjectURL(uploadFile.file)}
                        alt={uploadFile.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getFileIcon(uploadFile.file)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-nuvia-deep">{uploadFile.file.name}</p>
                        <span className="text-xs bg-nuvia-mauve/20 text-nuvia-mauve px-2 py-1 rounded-full">
                          {getFileTypeLabel(uploadFile.file)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadFile.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={() => removeUploadFile(uploadFile.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Progress
                        value={uploadFile.progress}
                        className={`flex-1 h-2 ${uploadFile.status === "error" ? "bg-red-200" : ""}`}
                      />
                      <span
                        className={`text-sm min-w-0 ${
                          uploadFile.status === "error" ? "text-red-600" : "text-nuvia-deep/70"
                        }`}>
                        {Math.round(uploadFile.progress)}%
                      </span>
                    </div>

                    <p className="text-xs text-nuvia-deep/50 mt-1">
                      {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type.split("/")[1]?.toUpperCase() || 'ARCHIVO'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}