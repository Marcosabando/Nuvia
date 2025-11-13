import { useState } from "react";
import { MoreHorizontal, Download, Heart, Trash2, Edit3, RefreshCw } from "lucide-react";
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
import { apiService } from "@/services/api.services";

// Config API
const API_CONFIG = {
  UPLOADS_URL: "http://localhost:3000/uploads",
};

// Helper para formatear tamaño
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// ✅ Helper mejorado: Construir URL correctamente
// ✅ Helper MEJORADO: Maneja todos los casos de rutas
const getImageUrl = (image: any, useThumbnail: boolean = false): string => {
  console.log("🔍 Construyendo URL para imagen:", {
    id: image.id,
    useThumbnail,
    imagePath: image.imagePath,
    thumbnailPath: image.thumbnailPath,
    mediumPath: image.mediumPath,
    filename: image.filename,
    userId: image.userId
  });

  // 1. PRIORIDAD: Thumbnails si se solicitan y existen
  if (useThumbnail) {
    if (image.thumbnailPath) {
      const path = normalizePath(image.thumbnailPath);
      const url = `http://localhost:3000/${path}`;
      console.log("🎯 Usando thumbnailPath:", url);
      return url;
    }
    // Si no hay thumbnailPath pero queremos thumbnail, usar medium como fallback
    if (image.mediumPath) {
      const path = normalizePath(image.mediumPath);
      const url = `http://localhost:3000/${path}`;
      console.log("🔄 Usando mediumPath como fallback para thumbnail:", url);
      return url;
    }
  }

  // 2. PRIORIDAD: Medium path para imágenes normales
  if (!useThumbnail && image.mediumPath) {
    const path = normalizePath(image.mediumPath);
    const url = `http://localhost:3000/${path}`;
    console.log("🎯 Usando mediumPath:", url);
    return url;
  }

  // 3. FALLBACK: imagePath con corrección automática
  if (image.imagePath) {
    const path = correctImagePath(image.imagePath);
    const url = `http://localhost:3000/${path}`;
    console.log("🔄 Usando imagePath corregido:", url);
    return url;
  }

  // 4. ÚLTIMO RECURSO: Construir desde userId y filename
  const url = `${API_CONFIG.UPLOADS_URL}/${image.userId}/images/${image.filename}`;
  console.log("⚡ URL construida desde cero:", url);
  return url;
};

// Helper para normalizar paths
const normalizePath = (path: string): string => {
  // Remover "uploads/" duplicado si existe
  let normalized = path.startsWith('uploads/') ? path : `uploads/${path}`;
  
  // Asegurar que no tenga dobles barras
  normalized = normalized.replace(/([^:]\/)\/+/g, '$1');
  
  return normalized;
};

// Helper para corregir imagePath (sin /images/)
const correctImagePath = (imagePath: string): string => {
  let path = normalizePath(imagePath);
  
  // Si la ruta es "uploads/2/archivo.png" pero debería ser "uploads/2/images/archivo.png"
  if (path.startsWith('uploads/') && 
      !path.includes('/images/') && 
      !path.includes('/videos/') &&
      path.split('/').length >= 3) {
    
    const parts = path.split('/');
    const userId = parts[1];
    const filename = parts.slice(2).join('/');
    
    // Verificar si el archivo existe en la carpeta images/
    path = `uploads/${userId}/images/${filename}`;
    console.log("🛠️ ImagePath corregido:", path);
  }
  
  return path;
};

interface ImageGalleryProps {
  viewMode?: "grid" | "list";
}

export default function ImageGallery({ viewMode = "grid" }: ImageGalleryProps) {
  const { images, loading, error, refetch } = useImages();
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<number, any>>({});

  // Toggle favorite con actualización optimista
  const toggleFavorite = async (id: number) => {
    try {
      setOptimisticUpdates(prev => ({
        ...prev,
        [id]: { isFavorite: !images.find(img => img.id === id)?.isFavorite }
      }));

      const response = await apiService.post(`/images/${id}/favorite`);
      
      if (response.success) {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[id];
          return newUpdates;
        });
        refetch();
      } else {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[id];
          return newUpdates;
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[id];
        return newUpdates;
      });
    }
  };

  // Delete con confirmación
  const deleteImage = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta imagen?")) {
      return;
    }

    try {
      setOptimisticUpdates(prev => ({
        ...prev,
        [id]: { deleted: true }
      }));

      const response = await apiService.delete(`/images/${id}`);

      if (response.success) {
        refetch();
      } else {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[id];
          return newUpdates;
        });
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[id];
        return newUpdates;
      });
      refetch();
    }
  };

  // Aplicar actualizaciones optimistas
  const displayImages = images
    .filter(img => !optimisticUpdates[img.id]?.deleted)
    .map(img => ({
      ...img,
      isFavorite: optimisticUpdates[img.id]?.isFavorite ?? img.isFavorite
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-600">Cargando imágenes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
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
          <p className="text-purple-600 mb-4">No tienes imágenes subidas aún</p>
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
          <Card key={image.id} className="group hover:shadow-lg transition-shadow border overflow-hidden relative">
            <CardContent className="p-0 relative">
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                <img
                  src={getImageUrl(image, true)}
                  alt={image.originalFilename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    console.error("❌ Error cargando imagen:", {
                      id: image.id,
                      filename: image.filename,
                      imagePath: image.imagePath,
                      thumbnailPath: image.thumbnailPath,
                      urlIntentada: e.currentTarget.src
                    });
                    
                    // Intentar cargar la imagen original si el thumbnail falla
                    if (e.currentTarget.src.includes("thumbnail") || e.currentTarget.src.includes("medium")) {
                      console.log("🔄 Intentando cargar imagen original...");
                      e.currentTarget.src = getImageUrl(image, false);
                    } else {
                      // Si también falla la original, mostrar placeholder
                      e.currentTarget.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EError%3C/text%3E%3C/svg%3E";
                    }
                  }}
                />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                <div
                  className="absolute top-1 right-1 md:top-2 md:right-2 z-20 flex gap-1 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => toggleFavorite(image.id)}>
                    <Heart
                      className={`w-3 h-3 md:w-4 md:h-4 ${isFavorite ? "text-red-500 fill-current" : "text-gray-600"}`}
                    />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 w-7 md:h-8 md:w-8 p-0 bg-white/90 hover:bg-white"
                        onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 z-[9999]" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => toggleFavorite(image.id)}>
                        <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "text-red-500 fill-current" : ""}`} />
                        {isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.open(getImageUrl(image, false), "_blank")}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => deleteImage(image.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Mover a papelera
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

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
                        src={getImageUrl(image, false)}
                        alt={image.originalFilename}
                        className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                      />
                      <div className="mt-4 text-sm text-gray-600">
                        <p>
                          <strong>Nombre:</strong> {image.originalFilename}
                        </p>
                        <p>
                          <strong>Tamaño:</strong> {formatFileSize(image.fileSize)}
                        </p>
                        <p>
                          <strong>Tipo:</strong> {image.mimeType}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

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