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

interface ImageItem {
  id: string;
  name: string;
  size: string;
  date: string;
  url: string;
  favorite: boolean;
  type: string;
}

// Sample data for demonstration
const sampleImages: ImageItem[] = [
  {
    id: "1",
    name: "Mountain Landscape.jpg",
    size: "2.4 MB",
    date: "2024-01-15",
    url: "/placeholder.svg",
    favorite: false,
    type: "JPEG"
  },
  {
    id: "2", 
    name: "City Skyline.png",
    size: "1.8 MB",
    date: "2024-01-14",
    url: "/placeholder.svg",
    favorite: true,
    type: "PNG"
  },
  {
    id: "3",
    name: "Abstract Art.jpg",
    size: "3.2 MB", 
    date: "2024-01-13",
    url: "/placeholder.svg",
    favorite: false,
    type: "JPEG"
  }
];

interface ImageGalleryProps {
  viewMode?: "grid" | "list";
}

export function ImageGallery({ viewMode = "grid" }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>(sampleImages);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  const toggleFavorite = (id: string) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, favorite: !img.favorite } : img
    ));
  };

  const deleteImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {images.map((image) => (
          <Card key={image.id} className="nuvia-card-hover border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  <img 
                    src={image.url} 
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{image.name}</h3>
                    {image.favorite && (
                      <Heart className="w-4 h-4 text-destructive fill-current" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{image.size}</span>
                    <span>{image.type}</span>
                    <span>{new Date(image.date).toLocaleDateString()}</span>
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
                          src={image.url} 
                          alt={image.name}
                          className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                        />
                        <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
                          <h3 className="font-medium">{image.name}</h3>
                          <p className="text-sm opacity-80">{image.size} • {image.type} • {new Date(image.date).toLocaleDateString()}</p>
                        </div>
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {images.map((image) => (
        <Card key={image.id} className="group nuvia-card-hover border-border overflow-hidden">
          <CardContent className="p-0 relative">
            <div className="aspect-square bg-muted relative overflow-hidden">
              <img 
                src={image.url} 
                alt={image.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              
              {/* Top-right actions - Responsive */}
              <div className="absolute top-1 right-1 md:top-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => toggleFavorite(image.id)}
                  >
                    <Heart 
                      className={`w-3 h-3 md:w-4 md:h-4 ${image.favorite ? 'text-destructive fill-current' : 'text-muted-foreground'}`} 
                    />
                  </Button>
                  <ImageActions 
                    image={image}
                    onToggleFavorite={() => toggleFavorite(image.id)}
                    onDelete={() => deleteImage(image.id)}
                  />
                </div>
              </div>

              {/* Bottom overlay with name - Responsive */}
              <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs md:text-sm font-medium truncate">{image.name}</p>
                <p className="text-white/80 text-xs">{image.size}</p>
              </div>

              {/* Preview on click */}
              <Dialog>
                <DialogTrigger asChild>
                  <button 
                    className="absolute inset-0 w-full h-full"
                    onClick={() => setSelectedImage(image)}
                  />
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] p-2 md:p-6">
                  <div className="relative">
                    <img 
                      src={image.url} 
                      alt={image.name}
                      className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                    />
                    <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 md:p-3 text-white">
                      <h3 className="font-medium text-sm md:text-base">{image.name}</h3>
                      <p className="text-xs md:text-sm opacity-80">{image.size} • {image.type} • {new Date(image.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Type badge - Responsive */}
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
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onToggleFavorite}>
          <Heart className="w-4 h-4 mr-2" />
          {image.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        </DropdownMenuItem>
        <DropdownMenuItem>
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
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Mover a papelera
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}