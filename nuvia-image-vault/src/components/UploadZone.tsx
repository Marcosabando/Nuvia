import { useState, useCallback, useEffect } from "react";
import { Upload, Image, X, CheckCircle } from "lucide-react";
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

  const uploadToServer = useCallback(
    async (uploadFile: UploadFile) => {
      try {
        console.log("📤 Subiendo archivo:", uploadFile.file.name);

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No hay sesión activa. Por favor, inicia sesión nuevamente.");
        }

        // Crear FormData
        const formData = new FormData();
        formData.append("file", uploadFile.file);

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

                // VERIFICAR SI LA RESPUESTA INDICA ÉXITO
                if (response.success) {
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

                  // Llamar callback para recargar imágenes
                  if (onUploadComplete) {
                    onUploadComplete();
                  }

                  resolve(response);
                } else {
                  // El servidor respondió OK pero con error en la lógica
                  reject(new Error(response.error || "Error al guardar la imagen"));
                }
              } catch (parseError) {
                reject(new Error("Error al procesar la respuesta del servidor"));
              }
            } else {
              // Error HTTP
              let errorMessage = `Error ${xhr.status}: ${xhr.statusText}`;
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.error || errorMessage;
              } catch (e) {}
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
          const endpoint = uploadFile.file.type.startsWith("video/")
            ? "http://localhost:3000/api/videos/upload"
            : "http://localhost:3000/api/images/upload";

          // Enviar al endpoint correcto
          xhr.open("POST", endpoint);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      } catch (error: any) {
        console.error("❌ Error completo subiendo archivo:", error);

        let errorMessage = `No se pudo subir ${uploadFile.file.name}`;

        if (error.message?.includes("401")) {
          errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente.";
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } else if (error.message?.includes("413")) {
          errorMessage = "El archivo es demasiado grande (máximo 10MB)";
        } else if (error.message?.includes("500")) {
          errorMessage = "Error interno del servidor al procesar la imagen";
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
    [toast]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      const mediaFiles = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));

      if (mediaFiles.length !== files.length) {
        toast({
          title: "Archivos no válidos",
          description: "Solo se permiten archivos de imagen y vídeo",
          variant: "destructive",
        });
      }

      // Verificar tamaño (10MB máximo)
      const oversizedFiles = mediaFiles.filter((file) => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "Archivos demasiado grandes",
          description: "El tamaño máximo por archivo es 10MB",
          variant: "destructive",
        });
        return;
      }

      const newUploadFiles: UploadFile[] = mediaFiles.map((file) => ({
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
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />

          <label htmlFor="file-input">
            <Button
              className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:from-nuvia-rose hover:to-nuvia-peach text-white shadow-nuvia-strong hover:shadow-nuvia-glow transition-all duration-300"
              asChild>
              <span className="cursor-pointer">
                <Image className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Elegir archivos
              </span>
            </Button>
          </label>

          <p className="text-xs text-nuvia-deep/50 mt-3 md:mt-4">
            Soporta: JPG, PNG, GIF, WebP, MP4, MOV (Máx. 10MB por archivo)
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
                    {uploadFile.file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(uploadFile.file)}
                        alt={uploadFile.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-6 h-6 text-nuvia-mauve" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium truncate text-nuvia-deep">{uploadFile.file.name}</p>
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
                      {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type.split("/")[1].toUpperCase()}
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
