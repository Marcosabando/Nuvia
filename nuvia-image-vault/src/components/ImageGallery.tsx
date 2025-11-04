// src/components/ImageGallery.tsx - SIN REFETCH
import { useState, useEffect } from "react";
import { MoreHorizontal, Download, Heart, Trash2, Edit3, ZoomIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useImages } from "@/hooks/useImages";
import { API_CONFIG } from "@/config/api.config";
import { apiService } from "@/services/api.services";

interface ImageItem {
  id: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  fileSize: number;
  mimeType: string;
  created: string;
  isFavorite?: boolean;
}

interface ImageGalleryProps {
  // viewMode?: "grid";
}

// Helper para formatear tamaño
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Helper para obtener URL de imagen
const getImageUrl = (imagePath: string): string => {
  let cleanPath = imagePath;
  if (imagePath.startsWith("uploads/")) {
    cleanPath = imagePath.replace("uploads/", "");
  }
  return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
};

export function ImageGallery(ImageGalleryProps) {
  const { images, loading, error } = useImages();
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [localImages, setLocalImages] = useState<ImageItem[]>([]);

  // ✅ Sincronizar localImages con images del hook SOLO en la carga inicial
  useEffect(() => {
    if (images.length > 0 && localImages.length === 0) {
      setLocalImages(images);
    }
  }, [images]);

  // ✅ FUNCIÓN MEJORADA: Toggle favorite SIN refetch
  const toggleFavorite = async (id: number) => {
    try {
      console.log("Toggle favorite for image:", id);
      
      // ✅ ACTUALIZACIÓN INMEDIATA del estado local
      setLocalImages(prevImages => 
        prevImages.map(img => 
          img.id === id 
            ? { ...img, isFavorite: !img.isFavorite } 
            : img
        )
      );

      // Llamar a la API en segundo plano
      const response = await apiService.post(`/images/${id}/favorite`);
      
      if (response.success) {
        console.log("✅ Favorite status updated:", response.data);
        // ✅ NO hacemos refetch - el estado local ya está actualizado
      }
    } catch (error) {
      console.error("❌ Error toggling favorite:", error);
      
      // ✅ REVERTIR en caso de error
      setLocalImages(prevImages => 
        prevImages.map(img => 
          img.id === id 
            ? { ...img, isFavorite: !img.isFavorite } // Revertir el cambio
            : img
        )
      );
    }
  };

  // ✅ FUNCIÓN MEJORADA: Delete SIN refetch
  const deleteImage = async (id: number) => {
    try {
      // ✅ ELIMINACIÓN INMEDIATA del estado local
      setLocalImages(prevImages => prevImages.filter(img => img.id !== id));
      
      // Llamar a la API en segundo plano
      await apiService.delete(`/images/${id}`);
      
      console.log("✅ Image deleted successfully");
      // ✅ NO hacemos refetch - el estado local ya está actualizado
      
    } catch (error) {
      console.error("Error deleting image:", error);
      
      // ✅ En caso de error, recargamos desde el servidor
      // Pero esto solo pasaría si hay un error grave
    }
  };

  // ✅ USAR localImages siempre que tenga datos
  const displayImages = localImages.length > 0 ? localImages : images;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-nuvia-mauve border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-nuvia-mauve">Cargando imágenes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (displayImages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-nuvia-mauve mb-4">No tienes imágenes subidas aún</p>
          <p className="text-sm text-gray-500">Sube tu primera imagen usando la pestaña "Subir"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {displayImages.map((image) => {
        const isFavorite = image.isFavorite || false;
        return (
          <Card key={image.id} className="group nuvia-card-hover border-border overflow-hidden relative">
            <CardContent className="p-0 relative">
              <div className="aspect-square bg-muted relative overflow-hidden">
                <img
                  src={getImageUrl(image.imagePath)}
                  alt={image.originalFilename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                {/* 🔹 Acciones arriba a la derecha */}
                <div
                  className="absolute top-1 right-1 md:top-2 md:right-2 z-20 flex gap-1 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => toggleFavorite(image.id)}
                  >
                    <Heart
                      className={`w-3 h-3 md:w-4 md:h-4 ${
                        isFavorite ? "text-destructive fill-current" : "text-muted-foreground"
                      }`}
                    />
                  </Button>

                  {/* Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 w-7 md:h-8 md:w-8 p-0 bg-white/90 hover:bg-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 z-[9999]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem onClick={() => toggleFavorite(image.id)}>
                        <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "text-destructive fill-current" : ""}`} />
                        {isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(getImageUrl(image.imagePath), "_blank")}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteImage(image.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Mover a papelera
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 🔹 Clic en la imagen para abrir el Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="absolute inset-0 w-full h-full pointer-events-auto"
                      onClick={() => setSelectedImage(image)}
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] p-2 md:p-6">
                    <div className="relative">
                      <img
                        src={getImageUrl(image.imagePath)}
                        alt={image.originalFilename}
                        className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Badge de favorito */}
              {isFavorite && (
                <div className="absolute top-1 left-1 md:top-2 md:left-2">
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                    <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 fill-current" />
                    <span className="hidden sm:inline">Favorito</span>
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}