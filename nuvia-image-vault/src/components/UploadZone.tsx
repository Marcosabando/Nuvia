// UploadZone.tsx - VERSIÓN CORREGIDA PARA 3GB
import { useState, useCallback, useRef } from "react";
import { Upload, Image, X, CheckCircle, FileText, AlertCircle, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UploadFile, UploadZoneProps } from "@/types/upload";
import {
  getUploadConfig,
  getFileType,
  isFileTypeAllowed,
  isFileSizeValid,
  formatFileSize,
  getUploadEndpoint,
  prepareFormData,
  validateServerResponse,
  handleServerError,
} from "@/middlewares/upload";

// Configuración de límites para 3GB (en bytes)
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB

export function UploadZone({ onUploadComplete, type = "all" }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);
  const [uploadSpeeds, setUploadSpeeds] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});
  const [totalUploaded, setTotalUploaded] = useState(0);
  const { toast } = useToast();
  const uploadStartTimes = useRef<Record<string, number>>({});
  const uploadedBytes = useRef<Record<string, number>>({});

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
      // Resetear el input para permitir subir el mismo archivo otra vez
      e.target.value = "";
    }
  }, []);

  const calculateSpeedAndTime = useCallback((fileId: string, loaded: number, total: number) => {
    const now = Date.now();
    const startTime = uploadStartTimes.current[fileId] || now;

    if (!uploadStartTimes.current[fileId]) {
      uploadStartTimes.current[fileId] = now;
      uploadedBytes.current[fileId] = 0;
    }

    const timeElapsed = (now - startTime) / 1000; // en segundos
    const bytesUploaded = loaded - (uploadedBytes.current[fileId] || 0);

    if (timeElapsed > 0) {
      const speed = bytesUploaded / timeElapsed; // bytes por segundo
      setUploadSpeeds((prev) => ({
        ...prev,
        [fileId]: speed,
      }));

      // Calcular tiempo restante
      if (speed > 0) {
        const remainingBytes = total - loaded;
        const remainingSeconds = remainingBytes / speed;

        let timeStr;
        if (remainingSeconds > 3600) {
          timeStr = `${Math.ceil(remainingSeconds / 3600)}h`;
        } else if (remainingSeconds > 60) {
          timeStr = `${Math.ceil(remainingSeconds / 60)}m`;
        } else {
          timeStr = `${Math.ceil(remainingSeconds)}s`;
        }

        setTimeRemaining((prev) => ({
          ...prev,
          [fileId]: timeStr,
        }));
      }
    }

    uploadedBytes.current[fileId] = loaded;
  }, []);

  const uploadToServer = useCallback(
    async (uploadFile: UploadFile) => {
      try {
        console.log("📤 Subiendo archivo:", uploadFile.file.name, "Tamaño:", formatFileSize(uploadFile.file.size));

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No hay sesión activa. Por favor, inicia sesión nuevamente.");
        }

        const fileType = getFileType(uploadFile.file);
        const endpoint = getUploadEndpoint(fileType);

        // ✅ CORRECCIÓN: Usar FormData simple, sin agregar campos extras
        const formData = new FormData();
        formData.append("video", uploadFile.file);

        // Opcional: agregar metadata si el backend la espera
        if (uploadFile.file.name) {
          formData.append("originalFilename", uploadFile.file.name);
        }

        console.log("📋 Endpoint:", endpoint);
        console.log("📋 Campo en FormData: video"); // Actualizado
        console.log("📋 Archivo:", {
          name: uploadFile.file.name,
          size: uploadFile.file.size,
          type: uploadFile.file.type,
        });

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Configurar timeouts para archivos grandes (30 minutos)
          xhr.timeout = 30 * 60 * 1000; // 30 minutos

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);

              setUploadingFiles((prev) =>
                prev.map((file) => (file.id === uploadFile.id ? { ...file, progress } : file))
              );

              // Actualizar total subido
              setTotalUploaded((prev) => prev + (event.loaded - (uploadedBytes.current[uploadFile.id] || 0)));

              // Calcular velocidad y tiempo restante
              calculateSpeedAndTime(uploadFile.id, event.loaded, event.total);
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

                if (validateServerResponse(response)) {
                  setUploadingFiles((prev) =>
                    prev.map((file) => {
                      if (file.id === uploadFile.id) {
                        return { ...file, progress: 100, status: "completed" };
                      }
                      return file;
                    })
                  );

                  // Limpiar datos de velocidad
                  setUploadSpeeds((prev) => {
                    const newSpeeds = { ...prev };
                    delete newSpeeds[uploadFile.id];
                    return newSpeeds;
                  });

                  setTimeRemaining((prev) => {
                    const newTimes = { ...prev };
                    delete newTimes[uploadFile.id];
                    return newTimes;
                  });

                  toast({
                    title: "✅ Subida completada",
                    description: `${uploadFile.file.name} se subió correctamente`,
                  });

                  if (onUploadComplete) {
                    onUploadComplete();
                  }

                  resolve(response);
                } else {
                  const errorMessage = response.error || `Error al guardar el ${fileType}`;

                  setUploadingFiles((prev) =>
                    prev.map((file) => {
                      if (file.id === uploadFile.id) {
                        return { ...file, status: "error", errorMessage };
                      }
                      return file;
                    })
                  );

                  reject(new Error(errorMessage));
                }
              } catch (parseError) {
                console.error("❌ Error parseando JSON:", parseError);

                setUploadingFiles((prev) =>
                  prev.map((file) => {
                    if (file.id === uploadFile.id) {
                      return {
                        ...file,
                        status: "error",
                        errorMessage: "Error procesando respuesta del servidor",
                      };
                    }
                    return file;
                  })
                );

                reject(new Error("Error procesando respuesta del servidor"));
              }
            } else {
              const errorMessage = handleServerError(xhr);

              setUploadingFiles((prev) =>
                prev.map((file) => {
                  if (file.id === uploadFile.id) {
                    return { ...file, status: "error", errorMessage };
                  }
                  return file;
                })
              );

              reject(new Error(errorMessage));
            }
          });

          xhr.addEventListener("error", () => {
            setUploadingFiles((prev) =>
              prev.map((file) => {
                if (file.id === uploadFile.id) {
                  return { ...file, status: "error", errorMessage: "Error de red. Verifica tu conexión." };
                }
                return file;
              })
            );
            reject(new Error("Error de red al conectar con el servidor"));
          });

          xhr.addEventListener("timeout", () => {
            setUploadingFiles((prev) =>
              prev.map((file) => {
                if (file.id === uploadFile.id) {
                  return {
                    ...file,
                    status: "error",
                    errorMessage: "Tiempo de espera agotado. El archivo es muy grande o la conexión es lenta.",
                  };
                }
                return file;
              })
            );
            reject(new Error("Tiempo de espera agotado durante la subida"));
          });

          xhr.addEventListener("abort", () => {
            setUploadingFiles((prev) =>
              prev.map((file) => {
                if (file.id === uploadFile.id) {
                  return { ...file, status: "error", errorMessage: "Subida cancelada por el usuario" };
                }
                return file;
              })
            );
            reject(new Error("Subida cancelada"));
          });

          xhr.open("POST", endpoint);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          // ✅ IMPORTANTE: NO agregar Content-Type, el navegador lo pondrá automáticamente con el boundary correcto

          xhr.send(formData);
        });
      } catch (error: any) {
        console.error("❌ Error en uploadToServer:", error);

        const errorMessage = error.message || "Error desconocido al subir archivo";

        setUploadingFiles((prev) =>
          prev.map((file) => {
            if (file.id === uploadFile.id) {
              return { ...file, status: "error", errorMessage };
            }
            return file;
          })
        );

        toast({
          title: "❌ Error en la subida",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      }
    },
    [toast, onUploadComplete, calculateSpeedAndTime]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      const config = getUploadConfig(type);
      const validFiles = files.filter((file) => isFileTypeAllowed(file, type));

      if (validFiles.length !== files.length) {
        const invalidCount = files.length - validFiles.length;
        toast({
          title: "Archivos no válidos",
          description: `${invalidCount} archivo(s) no son válidos para ${type === "all" ? "esta zona" : type}`,
          variant: "destructive",
        });
      }

      if (validFiles.length === 0) return;

      // Verificar tamaño individual (3GB máximo)
      const oversizedFiles = validFiles.filter((file) => {
        const fileType = getFileType(file);
        const isValid = isFileSizeValid(file, fileType);

        if (!isValid) {
          console.log(`❌ Archivo demasiado grande: ${file.name} - ${formatFileSize(file.size)}`);
        }

        return !isValid;
      });

      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map((f) => f.name).join(", ");
        toast({
          title: "Archivos demasiado grandes",
          description: `Los siguientes archivos superan el límite de 3GB: ${fileNames}`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      // Verificar tamaño total (evitar subidas masivas)
      const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 10 * 1024 * 1024 * 1024) {
        // 10GB total máximo
        toast({
          title: "Demasiados datos",
          description: "El tamaño total de los archivos supera 10GB. Sube menos archivos a la vez.",
          variant: "destructive",
        });
        return;
      }

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        progress: 0,
        status: "uploading",
        startTime: Date.now(),
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadFiles]);

      // Subir archivos con un límite de concurrencia (2 a la vez)
      const MAX_CONCURRENT_UPLOADS = 2;
      const uploadQueue = [...newUploadFiles];
      let activeUploads = 0;

      const processQueue = async () => {
        while (uploadQueue.length > 0 && activeUploads < MAX_CONCURRENT_UPLOADS) {
          const uploadFile = uploadQueue.shift();
          if (uploadFile) {
            activeUploads++;
            try {
              await uploadToServer(uploadFile);
            } catch (error) {
              console.error("Error en subida:", error);
            } finally {
              activeUploads--;
              processQueue();
            }
          }
        }
      };

      // Iniciar procesamiento
      for (let i = 0; i < Math.min(MAX_CONCURRENT_UPLOADS, uploadQueue.length); i++) {
        processQueue();
      }
    },
    [toast, uploadToServer, type]
  );

  const removeUploadFile = useCallback((id: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        // Actualizar total subido
        const uploaded = (file.progress * file.file.size) / 100;
        setTotalUploaded((prevTotal) => prevTotal - uploaded);
      }

      // Limpiar datos de velocidad
      setUploadSpeeds((prev) => {
        const newSpeeds = { ...prev };
        delete newSpeeds[id];
        return newSpeeds;
      });

      setTimeRemaining((prev) => {
        const newTimes = { ...prev };
        delete newTimes[id];
        return newTimes;
      });

      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const cancelAllUploads = useCallback(() => {
    setUploadingFiles((prev) => prev.map((file) => ({ ...file, status: "error", errorMessage: "Subida cancelada" })));
    setTotalUploaded(0);
    setUploadSpeeds({});
    setTimeRemaining({});
    uploadStartTimes.current = {};
    uploadedBytes.current = {};

    toast({
      title: "Subidas canceladas",
      description: "Todas las subidas en curso han sido canceladas",
    });
  }, [toast]);

  const retryUpload = useCallback(
    async (uploadFile: UploadFile) => {
      setUploadingFiles((prev) =>
        prev.map((file) =>
          file.id === uploadFile.id
            ? { ...uploadFile, progress: 0, status: "uploading", errorMessage: undefined }
            : file
        )
      );

      // Resetear datos de velocidad
      delete uploadStartTimes.current[uploadFile.id];
      delete uploadedBytes.current[uploadFile.id];

      await uploadToServer({ ...uploadFile, progress: 0, status: "uploading" });
    },
    [uploadToServer]
  );

  const getFileIcon = (file: File) => {
    const fileType = getFileType(file);
    switch (fileType) {
      case "image":
        return <Image className="w-6 h-6 text-nuvia-mauve" />;
      case "video":
        return <Video className="w-6 h-6 text-nuvia-mauve" />;
      case "document":
        return <FileText className="w-6 h-6 text-nuvia-mauve" />;
      default:
        return <FileText className="w-6 h-6 text-nuvia-mauve" />;
    }
  };

  const getFileTypeLabel = (file: File): string => {
    const fileType = getFileType(file);
    switch (fileType) {
      case "image":
        return "Imagen";
      case "video":
        return "Video";
      case "document":
        return "Documento";
      default:
        return "Archivo";
    }
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond >= 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    } else if (bytesPerSecond >= 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${bytesPerSecond.toFixed(0)} B/s`;
    }
  };

  const config = getUploadConfig(type);

  // Calcular estadísticas generales
  const completedUploads = uploadingFiles.filter((f) => f.status === "completed").length;
  const failedUploads = uploadingFiles.filter((f) => f.status === "error").length;
  const inProgressUploads = uploadingFiles.filter((f) => f.status === "uploading").length;
  const totalSize = uploadingFiles.reduce((sum, file) => sum + file.file.size, 0);

  return (
    <div className="space-y-6">
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
            <Upload className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg-h-12 text-nuvia-mauve" />
          </div>

          <h3 className="text-lg md:text-xl font-semibold mb-2 text-nuvia-deep">
            Arrastra tus {type === "all" ? "archivos" : type} aquí
          </h3>
          <p className="text-sm md:text-base text-nuvia-deep/70 mb-4 md:mb-6 px-4">
            O haz clic para buscar y seleccionar archivos de tu dispositivo
          </p>

          <input
            type="file"
            multiple
            accept={config.acceptString}
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />

          <label htmlFor="file-input">
            <Button
              className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:from-nuvia-rose hover:to-nuvia-peach text-white shadow-nuvia-strong hover:shadow-nuvia-glow transition-all duration-300 hover:scale-105"
              asChild>
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Elegir archivos
              </span>
            </Button>
          </label>

          <p className="text-xs text-nuvia-deep/50 mt-3 md:mt-4">{config.description} • Máximo 3GB por archivo</p>

          <div className="mt-4 text-xs text-nuvia-deep/40 space-y-1">
            <p>📁 Formatos soportados: {type === "all" ? "Imágenes, Videos, Documentos" : type}</p>
            <p>⚡ Subida optimizada para archivos grandes</p>
            <p>⏱️ Timeout extendido para conexiones lentas</p>
          </div>
        </CardContent>
      </Card>

      {uploadingFiles.length > 0 && (
        <Card className="border border-nuvia-peach/30 bg-white/50 backdrop-blur-sm rounded-2xl shadow-nuvia-soft">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h4 className="font-semibold flex items-center gap-2 text-nuvia-deep">
                <Upload className="w-5 h-5 text-nuvia-mauve" />
                Subiendo archivos ({uploadingFiles.length})
              </h4>

              <div className="flex items-center gap-2 text-sm text-nuvia-deep/70">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ {completedUploads}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">⏳ {inProgressUploads}</span>
                {failedUploads > 0 && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">❌ {failedUploads}</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={cancelAllUploads}
                  disabled={inProgressUploads === 0}>
                  Cancelar todas
                </Button>
              </div>
            </div>

            {/* Barra de progreso general */}
            {inProgressUploads > 0 && (
              <div className="mb-4 p-3 bg-nuvia-peach/10 rounded-lg">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-nuvia-deep/70">
                    Progreso total: {formatFileSize(totalUploaded)} de {formatFileSize(totalSize)}
                  </span>
                  <span className="text-nuvia-deep">{Math.round((totalUploaded / totalSize) * 100)}%</span>
                </div>
                <Progress value={(totalUploaded / totalSize) * 100} className="h-2" />
              </div>
            )}

            <div className="space-y-4">
              {uploadingFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
                    uploadFile.status === "completed"
                      ? "bg-green-50 border border-green-200"
                      : uploadFile.status === "error"
                      ? "bg-red-50 border border-red-200"
                      : "bg-nuvia-peach/10 border border-nuvia-peach/20"
                  }`}>
                  <div className="w-12 h-12 rounded-lg bg-white border border-nuvia-peach/30 flex items-center justify-center overflow-hidden shadow-nuvia-soft flex-shrink-0">
                    {getFileType(uploadFile.file) === "image" ? (
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-medium truncate text-nuvia-deep">{uploadFile.file.name}</p>
                        <span className="text-xs bg-nuvia-mauve/20 text-nuvia-mauve px-2 py-1 rounded-full flex-shrink-0">
                          {getFileTypeLabel(uploadFile.file)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadFile.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {uploadFile.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                          onClick={() => removeUploadFile(uploadFile.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Progress
                          value={uploadFile.progress}
                          className={`flex-1 h-2 ${uploadFile.status === "error" ? "bg-red-200" : ""}`}
                        />
                        <span
                          className={`text-sm min-w-[50px] text-right ${
                            uploadFile.status === "error" ? "text-red-600" : "text-nuvia-deep/70"
                          }`}>
                          {Math.round(uploadFile.progress)}%
                        </span>
                      </div>

                      {/* Información adicional para archivos en progreso */}
                      {uploadFile.status === "uploading" && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-nuvia-deep/60">
                          <span>{formatFileSize(uploadFile.file.size)}</span>
                          <span>•</span>
                          {uploadSpeeds[uploadFile.id] && (
                            <>
                              <span>{formatSpeed(uploadSpeeds[uploadFile.id])}</span>
                              <span>•</span>
                            </>
                          )}
                          {timeRemaining[uploadFile.id] && <span>⏱️ {timeRemaining[uploadFile.id]}</span>}
                        </div>
                      )}
                    </div>

                    {uploadFile.status === "error" && uploadFile.errorMessage && (
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs text-red-600 flex-1">{uploadFile.errorMessage}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => retryUpload(uploadFile)}>
                            Reintentar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => removeUploadFile(uploadFile.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    )}

                    {uploadFile.status === "completed" && (
                      <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Subido correctamente</span>
                      </div>
                    )}
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
