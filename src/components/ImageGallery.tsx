import { useState } from "react";
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
import { apiService } from "@/services/api.service";

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
  favorite?: boolean;
}

interface ImageGalleryProps {
  viewMode?: "grid" | "list";
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

export function ImageGallery({ viewMode = "grid" }: ImageGalleryProps) {
  const { images, loading, error, refetch } = useImages();
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  const toggleFavorite = (id: number) => {
    console.log("Toggle favorite for image:", id);
  };

  const deleteImage = async (id: number) => {
    try {
      await apiService.delete(`/images/${id}`);
      refetch();
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

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
          <Button onClick={refetch} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-nuvia-mauve mb-4">No tienes imágenes subidas aún</p>
          <p className="text-sm text-gray-500">Sube tu primera imagen usando la pestaña "Subir"</p>
        </div>
      </div>
    );
  }

  // ----- MODO LISTA -----
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {images.map((image) => (
          <Card key={image.id} className="nuvia-card-hover border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={getImageUrl(image.imagePath)}
                    alt={image.originalFilename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{image.originalFilename}</h3>
                    {image.favorite && <Heart className="w-4 h-4 text-destructive fill-current" />}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(image.fileSize)}</span>
                    <span>{image.mimeType.split("/")[1].toUpperCase()}</span>
                    <span>{new Date(image.created).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedImage(image)}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                      <div className="relative">
                        <img
                          src={getImageUrl(image.imagePath)}
                          alt={image.originalFilename}
                          className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <ImageActions
                    image={image}
                    onToggleFavorite={() => toggleFavorite(image.id)}
                    onDelete={() => deleteImage(image.id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ----- MODO GRID -----
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {images.map((image) => (
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
                      image.favorite ? "text-destructive fill-current" : "text-muted-foreground"
                    }`}
                  />
                </Button>

                {/* Dropdown Menu con z-index alto */}
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
                      <Heart className="w-4 h-4 mr-2" />
                      {image.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
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
            {image.favorite && (
              <div className="absolute top-1 left-1 md:top-2 md:left-2">
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 fill-current" />
                  <span className="hidden sm:inline">Favorito</span>
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ImageActionsProps {
  image: ImageItem;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function ImageActions({ image, onToggleFavorite, onDelete }: ImageActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-[9999]" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onToggleFavorite}>
          <Heart className="w-4 h-4 mr-2" />
          {image.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
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
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" />
          Mover a papelera
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
