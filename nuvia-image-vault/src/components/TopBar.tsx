// src/components/TopBar.tsx
import { useState, useCallback } from "react";
import { Search, Grid3X3, List, Filter, Upload, MoreHorizontal, SlidersHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

// Componente para el avatar del usuario
interface UserAvatarProps {
  size?: number;
  className?: string;
  showBadge?: boolean;
}

export const UserAvatar = ({ size = 32, className = "", showBadge = false }: UserAvatarProps) => {
  const { profile, getProfileImageUrl, loading } = useProfile();
  
  if (loading) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-r from-nuvia-mauve/20 to-nuvia-rose/20 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  
  return (
    <div className="relative">
      <img
        src={getProfileImageUrl({ size: size * 2, variant: 'gradient' })}
        alt={profile?.username || "Usuario"}
        className={`rounded-full object-cover border border-nuvia-mauve/30 ${className}`}
        style={{ width: size, height: size }}
      />
      {showBadge && profile?.status === "active" && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
      )}
    </div>
  );
};

export function TopBar({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const uploadToServer = useCallback(
    async (file: File) => {
      try {
        console.log("📤 Subiendo archivo:", file.name);

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No hay sesión activa. Por favor, inicia sesión nuevamente.");
        }

        // Crear FormData
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);
              // Podrías agregar aquí un estado para mostrar progreso si lo deseas
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
                  toast({
                    title: "✅ Subida completada",
                    description: `${file.name} se subió correctamente`,
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
          xhr.open("POST", "http://localhost:3000/api/images/upload");
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      } catch (error: any) {
        console.error("❌ Error completo subiendo archivo:", error);

        let errorMessage = `No se pudo subir ${file.name}`;

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

        toast({
          title: "❌ Error en la subida",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast, onUploadComplete]
  );

  const handleFileUpload = useCallback(async () => {
    // Crear input file dinámicamente
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,video/*";

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const files = Array.from(target.files);

        // Validar tipos de archivo
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

        // Subir cada archivo
        for (const file of mediaFiles) {
          await uploadToServer(file);
        }
      }
    };

    input.click();
  }, [toast, uploadToServer]);

  // Función para manejar la navegación al perfil con dropdown
  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <header className="h-14 md:h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-3 sm:px-4 md:px-6 gap-2 md:gap-4">
        {/* Left Section - Navigation & Search */}
        <div className="flex items-center gap-2 md:gap-4 flex-1">
          <SidebarTrigger className="hover:bg-muted rounded-lg transition-colors" />

          {/* Desktop Search */}
          {!isMobile && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border focus:border-primary transition-colors"
              />
            </div>
          )}
        </div>

        {/* Right Section - Actions & Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Button */}
          {isMobile && (
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Search className="w-4 h-4" />
            </Button>
          )}

          {/* Upload Button */}
          {/* <Button
            onClick={handleFileUpload}
            variant="ghost"
            size="sm"
            className="hidden sm:flex gap-2 hover:bg-primary/10"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Subir</span>
          </Button> */}

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-primary/10 p-1 sm:p-2"
              >
                <UserAvatar size={isMobile ? 32 : 36} showBadge={true} />
                {!isMobile && (
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium leading-none">
                      {profile?.username || "Usuario"}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-3 p-2">
                <UserAvatar size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{profile?.username || "Usuario"}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {profile?.email || "usuario@email.com"}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="w-4 h-4 mr-2" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  localStorage.clear();
                  navigate("/login");
                }}
                className="text-red-600 focus:text-red-600"
              >
                <span className="w-4 h-4 mr-2">🚪</span>
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}