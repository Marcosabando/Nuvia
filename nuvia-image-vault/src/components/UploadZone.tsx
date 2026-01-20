import { useState, useCallback, useEffect } from "react";
import { Upload, Image, X, CheckCircle, FileText, AlertCircle } from "lucide-react";
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

export function UploadZone({ onUploadComplete, type = "all" }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();

  // Limpieza de object URLs para evitar fugas de memoria
  useEffect(() => {
    const objectUrls = new Map<string, string>();

    uploadingFiles.forEach((uf) => {
      if (getFileType(uf.file) === "image") {
        if (!objectUrls.has(uf.id)) {
          objectUrls.set(uf.id, URL.createObjectURL(uf.file));
        }
      }
    });

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadingFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
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

  const uploadToServer = useCallback(
    async (uploadFile: UploadFile) => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No hay sesión activa");

        const fileType = getFileType(uploadFile.file);
        const endpoint = getUploadEndpoint(fileType);
        const formData = prepareFormData(uploadFile.file, fileType);

        return await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) return;
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f))
            );
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);

                if (validateServerResponse(response)) {
                  setUploadingFiles((prev) =>
                    prev.map((f) =>
                      f.id === uploadFile.id ? { ...f, progress: 100, status: "completed" } : f
                    )
                  );

                  toast({
                    title: "✅ Subida completada",
                    description: `${uploadFile.file.name} se subió correctamente`,
                  });

                  onUploadComplete?.();

                  resolve(response);
                } else {
                  const errorMessage =
                    response?.error || `Error al guardar el ${fileType}`;

                  setUploadingFiles((prev) =>
                    prev.map((f) =>
                      f.id === uploadFile.id ? { ...f, status: "error", errorMessage } : f
                    )
                  );

                  reject(new Error(errorMessage));
                }
              } catch {
                const errorMessage = "Error procesando respuesta del servidor";

                setUploadingFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadFile.id ? { ...f, status: "error", errorMessage } : f
                  )
                );

                reject(new Error(errorMessage));
              }
            } else {
              const errorMessage = handleServerError(xhr);

              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id ? { ...f, status: "error", errorMessage } : f
                )
              );

              reject(new Error(errorMessage));
            }
          });

          xhr.addEventListener("error", () => {
            const errorMessage = "Error de red al conectar con el servidor";

            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, status: "error", errorMessage } : f
              )
            );

            reject(new Error(errorMessage));
          });

          xhr.addEventListener("abort", () => {
            const errorMessage = "Subida cancelada";

            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, status: "error", errorMessage } : f
              )
            );

            reject(new Error(errorMessage));
          });

          xhr.open("POST", endpoint);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      } catch (error: any) {
        const errorMessage = error?.message || "Error desconocido al subir archivo";

        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "error", errorMessage } : f))
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

  const handleFiles = useCallback(
    (files: File[]) => {
      const config = getUploadConfig(type);
      const validFiles = files.filter((file) => isFileTypeAllowed(file, type));

      if (validFiles.length !== files.length) {
        const invalidCount = files.length - validFiles.length;
        toast({
          title: "Archivos no válidos",
          description: `${invalidCount} archivo(s) no son válidos para ${
            type === "all" ? "esta zona" : type
          }`,
          variant: "destructive",
        });
      }

      if (validFiles.length === 0) return;

      const oversizedFiles = validFiles.filter((file) => {
        const ft = getFileType(file);
        return !isFileSizeValid(file, ft);
      });

      if (oversizedFiles.length > 0) {
        toast({
          title: "Archivos demasiado grandes",
          description: config.description,
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

      // Subida secuencial para evitar sobrecarga
      newUploadFiles.reduce(async (prevPromise, uf) => {
        await prevPromise;
        return uploadToServer(uf);
      }, Promise.resolve());
    },
    [toast, uploadToServer, type]
  );

  const removeUploadFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const retryUpload = useCallback(
    async (uploadFile: UploadFile) => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...uploadFile, progress: 0, status: "uploading", errorMessage: undefined }
            : f
        )
      );

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
        return (
          <div className="w-6 h-6 bg-nuvia-mauve rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">VID</span>
          </div>
        );
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

  const config = getUploadConfig(type);

  return (
    <div className="space-y-6">
      <Card
        className={`border-2 border-dashed transition-all duration-300 ${
          dragActive
            ? "border-nuvia-rose bg-nuvia-rose/10"
            : "border-nuvia-peach/30 hover:border-nuvia-mauve/50"
        } rounded-2xl shadow-nuvia-soft`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-6 md:p-8 lg:p-12 text-center">
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-nuvia-peach/20 to-nuvia-rose/20 flex items-center justify-center mb-4 md:mb-6 shadow-nuvia-glow">
            <Upload className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-nuvia-mauve" />
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
              className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:from-nuvia-rose hover:to-nuvia-peach text-white shadow-nuvia-strong hover:shadow-nuvia-glow transition-all duration-300"
              asChild
            >
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Elegir archivos
              </span>
            </Button>
          </label>

          <p className="text-xs text-nuvia-deep/50 mt-3 md:mt-4">{config.description}</p>
        </CardContent>
      </Card>

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
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-white border border-nuvia-peach/30 flex items-center justify-center overflow-hidden shadow-nuvia-soft">
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-nuvia-deep">
                          {uploadFile.file.name}
                        </p>
                        <span className="text-xs bg-nuvia-mauve/20 text-nuvia-mauve px-2 py-1 rounded-full">
                          {getFileTypeLabel(uploadFile.file)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {uploadFile.status === "completed" && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {uploadFile.status === "error" && (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={() => removeUploadFile(uploadFile.id)}
                        >
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
                        }`}
                      >
                        {Math.round(uploadFile.progress)}%
                      </span>
                    </div>

                    {uploadFile.status === "error" && uploadFile.errorMessage && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-red-600 flex-1">{uploadFile.errorMessage}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => retryUpload(uploadFile)}
                        >
                          Reintentar
                        </Button>
                      </div>
                    )}

                    <p className="text-xs text-nuvia-deep/50 mt-1">
                      {formatFileSize(uploadFile.file.size)} •{" "}
                      {uploadFile.file.type.split("/")[1]?.toUpperCase() || "ARCHIVO"}
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
