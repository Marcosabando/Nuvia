import { useState, useEffect, useCallback } from "react";
import {
  MoreHorizontal, Download, Heart, Trash2, Edit3, RefreshCw,
  FolderPlus, X, Calendar, Eye, EyeOff, Grid3X3, List, Search, Filter, Upload,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useImages } from "@/hooks/useImages";
import { apiService } from "@/services/api.services";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:3000";

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const normalizePath = (path: string): string =>
  (path.startsWith("uploads/") ? path : `uploads/${path}`).replace(/([^:]\/)\/+/g, "$1");

const getImageUrl = (image: any, useThumbnail = false): string => {
  const pathKey = useThumbnail
    ? (image.thumbnailPath || image.mediumPath)
    : (image.mediumPath || image.imagePath);

  if (pathKey) {
    let path = normalizePath(pathKey);
    if (!path.includes("/images/") && !path.includes("/videos/") && path.split("/").length >= 3) {
      const [, userId, ...rest] = path.split("/");
      path = `uploads/${userId}/images/${rest.join("/")}`;
    }
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}/uploads/${image.userId}/images/${image.filename}`;
};

interface Folder {
  id: number;
  folderId?: number;
  name: string;
  color: string;
  isSystem: boolean;
  itemCount: number;
}

export default function ImageGallery({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  const [currentViewMode, setCurrentViewMode] = useState<"grid" | "list">(viewMode);
  const [searchTerm, setSearchTerm] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const { images, loading, error, refetch } = useImages();
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<number, any>>({});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  const [renameModal, setRenameModal] = useState<{ open: boolean; image: any; name: string }>({
    open: false, image: null, name: "",
  });
  const [isRenaming, setIsRenaming] = useState(false);
  const { toast } = useToast();

  const showToast = (success: boolean, message: string) => {
    toast({
      title: success ? "✅ Éxito" : "❌ Error",
      description: message,
      ...(success
        ? { className: "bg-green-50 border-green-200 text-green-800" }
        : { variant: "destructive" }),
    });
  };

  // ✅ fetch folders (solo 1 vez al montar)
  const fetchFoldersOnce = useCallback(async () => {
    try {
      setFoldersLoading(true);
      const res = await apiService.get("/folders");
      if (res.success) setFolders(res.data.filter((f: Folder) => !f.isSystem));
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFoldersOnce();
  }, [fetchFoldersOnce]);

  // ✅ escuchar delta global: si otra parte suma/resta, también actualiza el dropdown de aquí
  useEffect(() => {
    const onDelta = (ev: Event) => {
      const e = ev as CustomEvent<{ folderId: number; delta: number }>;
      if (!e.detail) return;
      const { folderId, delta } = e.detail;

      setFolders((prev) =>
        prev.map((f) => {
          const fid = Number(f.folderId ?? f.id);
          if (fid !== Number(folderId)) return f;
          return { ...f, itemCount: Math.max(0, (f.itemCount || 0) + delta) };
        })
      );
    };

    window.addEventListener("folders:itemDelta", onDelta as EventListener);
    return () => window.removeEventListener("folders:itemDelta", onDelta as EventListener);
  }, []);

  // ✅ AÑADIR A CARPETA (optimista + sidebar)
  const addToFolder = async (imageId: number, folderId: number) => {
    if (!folderId || isNaN(folderId)) return showToast(false, "ID de carpeta inválido");

    // ✅ optimista: sube contador en el dropdown inmediatamente
    setFolders((prev) =>
      prev.map((f) => {
        const fid = Number(f.folderId ?? f.id);
        if (fid !== Number(folderId)) return f;
        return { ...f, itemCount: (f.itemCount || 0) + 1 };
      })
    );

    // ✅ optimista: sube contador del SIDEBAR sin refetch
    window.dispatchEvent(
      new CustomEvent("folders:itemDelta", { detail: { folderId: Number(folderId), delta: 1 } })
    );

    try {
      const res = await apiService.post(`/folders/${folderId}/images`, { imageId });

      if (res.success) {
        showToast(true, "Imagen añadida a la carpeta");
        // opcional “verificación” sin spamear:
        // window.dispatchEvent(new Event("folders:refresh"));
        return;
      }

      // ❌ si falla el backend, revertimos el optimismo
      setFolders((prev) =>
        prev.map((f) => {
          const fid = Number(f.folderId ?? f.id);
          if (fid !== Number(folderId)) return f;
          return { ...f, itemCount: Math.max(0, (f.itemCount || 0) - 1) };
        })
      );
      window.dispatchEvent(
        new CustomEvent("folders:itemDelta", { detail: { folderId: Number(folderId), delta: -1 } })
      );

      showToast(false, res.error || "Error al añadir imagen");
    } catch (e: any) {
      // ❌ revertimos también si hay excepción
      setFolders((prev) =>
        prev.map((f) => {
          const fid = Number(f.folderId ?? f.id);
          if (fid !== Number(folderId)) return f;
          return { ...f, itemCount: Math.max(0, (f.itemCount || 0) - 1) };
        })
      );
      window.dispatchEvent(
        new CustomEvent("folders:itemDelta", { detail: { folderId: Number(folderId), delta: -1 } })
      );

      showToast(false, e.response?.data?.error || "Error al añadir imagen");
    }
  };

  const renameImage = async () => {
    if (!renameModal.name.trim()) return showToast(false, "El nombre no puede estar vacío");
    setIsRenaming(true);
    try {
      const res = await apiService.patch(`/images/${renameModal.image.id}/title`, {
        title: renameModal.name.trim(),
      });
      if (res.success) {
        showToast(true, "Imagen renombrada");
        setRenameModal({ open: false, image: null, name: "" });
        refetch();
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      showToast(false, e.response?.data?.error || "Error al renombrar");
    } finally {
      setIsRenaming(false);
    }
  };

  const toggleFavorite = async (id: number) => {
    const current = images.find((img) => img.id === id)?.isFavorite;
    setOptimisticUpdates((p) => ({ ...p, [id]: { isFavorite: !current } }));
    try {
      await apiService.post(`/images/${id}/favorite`);
      refetch();
    } finally {
      setOptimisticUpdates((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  };

  const deleteImage = async (id: number) => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    setOptimisticUpdates((p) => ({ ...p, [id]: { deleted: true } }));
    setSelectedImage(null);
    try {
      await apiService.delete(`/images/${id}`);
      refetch();
    } catch {
      setOptimisticUpdates((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  };

  const displayImages = images
    .filter((img) => !optimisticUpdates[img.id]?.deleted)
    .map((img) => ({ ...img, isFavorite: optimisticUpdates[img.id]?.isFavorite ?? img.isFavorite }));

  const filteredImages = displayImages.filter((image) => {
    const matchesSearch =
      image.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = !favoritesOnly || image.isFavorite;
    return matchesSearch && matchesFavorites;
  });

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedImages = filteredImages.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, favoritesOnly, currentViewMode]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header con controles */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nuvia-deep/40 w-4 h-4" />
              <Input
                placeholder="Buscar imágenes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 border-nuvia-silver/30"
              />
            </div>
            
            <Button
              variant={favoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`whitespace-nowrap border-nuvia-silver/30 ${
                favoritesOnly 
                  ? 'bg-nuvia-mauve hover:bg-nuvia-mauve/90 text-white' 
                  : 'text-white'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Favoritos
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={refetch}
              disabled={loading}
              className="border-nuvia-silver/30 text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <div className="flex border border-nuvia-silver/30 rounded-lg overflow-hidden">
              <Button
                variant={currentViewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="w-9 h-9 rounded-none"
                onClick={() => setCurrentViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={currentViewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="w-9 h-9 rounded-none"
                onClick={() => setCurrentViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Grid de Imágenes */}
        {loading && filteredImages.length === 0 ? (
          <div className={
            currentViewMode === 'grid' 
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
              : "space-y-4"
          }>
            {Array.from({ length: 20 }).map((_, i) => (
              currentViewMode === 'list' ? (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4">
                  <div className="w-20 h-20 bg-nuvia-silver/30 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-nuvia-silver/30 rounded w-3/4" />
                    <div className="h-3 bg-nuvia-silver/30 rounded w-1/2" />
                    <div className="h-3 bg-nuvia-silver/30 rounded w-2/3" />
                  </div>
                </div>
              ) : (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-nuvia-silver/30 rounded-xl mb-3" />
                  <div className="h-4 bg-nuvia-silver/30 rounded mb-2" />
                  <div className="h-3 bg-nuvia-silver/30 rounded w-2/3" />
                </div>
              )
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-nuvia-peach/20 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-nuvia-mauve" />
            </div>
            <h3 className="text-lg font-semibold text-nuvia-deep mb-2">
              No hay imágenes
            </h3>
            <p className="text-nuvia-deep/60 mb-4">
              Comienza subiendo tu primera imagen
            </p>
          </div>
        ) : (
          <>
            <div className={
              currentViewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
                : "space-y-4"
            }>
              {paginatedImages.map(image => {
                const displayName = image.title || image.originalFilename;
                
                if (currentViewMode === 'list') {
                  // Vista de lista
                  return (
                    <Card key={image.id} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Imagen pequeña a la izquierda */}
                          <div 
                            className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg relative overflow-hidden cursor-pointer"
                            onClick={() => setSelectedImage(image)}
                          >
                            <img
                              src={getImageUrl(image, true)}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const src = e.currentTarget.src;
                                if (src.includes("thumbnail") || src.includes("medium")) {
                                  e.currentTarget.src = getImageUrl(image, false);
                                } else {
                                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EError%3C/text%3E%3C/svg%3E";
                                }
                              }}
                            />
                            {image.isFavorite && (
                              <div className="absolute top-1 left-1 z-10 pointer-events-none">
                                <div className="bg-red-500 rounded-md px-1 py-0.5 shadow-sm">
                                  <Heart className="w-2 h-2 text-white fill-current" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Información de la imagen */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-nuvia-deep truncate mb-1">
                                  {displayName}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-nuvia-deep/60">
                                  <span>{formatFileSize(image.fileSize)}</span>
                                  {image.width && image.height && (
                                    <span>{image.width}×{image.height}</span>
                                  )}
                                  <span className="capitalize">{image.mimeType?.split("/")[1]}</span>
                                </div>
                              </div>
                              
                              {/* Botones de acción en vista lista */}
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(image.id);
                                  }}
                                >
                                  <Heart className={`w-3 h-3 ${image.isFavorite ? "text-red-500 fill-current" : "text-gray-600"}`} />
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 z-[9999]">
                                    <DropdownMenuItem onClick={() => toggleFavorite(image.id)}>
                                      <Heart className={`w-4 h-4 mr-2 ${image.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                      {image.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <FolderPlus className="w-4 h-4 mr-2" />
                                        Añadir a carpeta
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="w-48">
                                          {foldersLoading ? (
                                            <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                                          ) : folders.length === 0 ? (
                                            <DropdownMenuItem disabled>No tienes carpetas</DropdownMenuItem>
                                          ) : (
                                            folders.map(folder => {
                                              const fid = folder.folderId || folder.id;
                                              if (!fid || isNaN(fid)) return null;
                                              return (
                                                <DropdownMenuItem 
                                                  key={fid} 
                                                  onClick={() => addToFolder(image.id, fid)}
                                                >
                                                  <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: folder.color }} />
                                                  <span className="truncate flex-1">{folder.name}</span>
                                                  {folder.itemCount > 0 && (
                                                    <span className="text-xs text-gray-500 ml-2">({folder.itemCount})</span>
                                                  )}
                                                </DropdownMenuItem>
                                              );
                                            })
                                          )}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    
                                    <DropdownMenuItem onClick={() => window.open(getImageUrl(image, false), "_blank")}>
                                      <Download className="w-4 h-4 mr-2" />
                                      Descargar
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => setRenameModal({ open: true, image, name: displayName })}>
                                      <Edit3 className="w-4 h-4 mr-2" />
                                      Renombrar
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem className="text-red-600" onClick={() => deleteImage(image.id)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Mover a papelera
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            {/* Información adicional - Solo en desktop */}
                            <div className="hidden sm:flex items-center gap-4 text-xs text-nuvia-deep/60">
                              <span>Subido: {new Date(image.createdAt).toLocaleDateString("es-ES")}</span>
                              {image.isPublic ? (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3 text-green-500" />
                                  Pública
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <EyeOff className="w-3 h-3 text-nuvia-deep/40" />
                                  Privada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Vista de grid (5 columnas)
                return (
                  <Card key={image.id} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                    <CardContent className="p-0 relative">
                      {/* Imagen clickeable */}
                      <div 
                        className="aspect-square bg-gray-50 relative overflow-hidden cursor-pointer" 
                        onClick={() => setSelectedImage(image)}
                      >
                        <img
                          src={getImageUrl(image, true)}
                          alt={displayName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            const src = e.currentTarget.src;
                            if (src.includes("thumbnail") || src.includes("medium")) {
                              e.currentTarget.src = getImageUrl(image, false);
                            } else {
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EError%3C/text%3E%3C/svg%3E";
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        
                        {/* Badge favorito */}
                        {image.isFavorite && (
                          <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <div className="bg-red-500 rounded-md px-1.5 py-1 shadow-sm">
                              <Heart className="w-3 h-3 text-white fill-current" />
                            </div>
                          </div>
                        )}
                        
                        {/* Botones de acción */}
                        <div 
                          className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(image.id);
                            }}
                          >
                            <Heart className={`w-3 h-3 ${image.isFavorite ? "text-red-500 fill-current" : "text-gray-600"}`} />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 z-[9999]" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => toggleFavorite(image.id)}>
                                <Heart className={`w-4 h-4 mr-2 ${image.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                {image.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                              </DropdownMenuItem>
                              
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderPlus className="w-4 h-4 mr-2" />
                                  Añadir a carpeta
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent className="w-48">
                                    {foldersLoading ? (
                                      <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                                    ) : folders.length === 0 ? (
                                      <DropdownMenuItem disabled>No tienes carpetas</DropdownMenuItem>
                                    ) : (
                                      folders.map(folder => {
                                        const fid = folder.folderId || folder.id;
                                        if (!fid || isNaN(fid)) return null;
                                        return (
                                          <DropdownMenuItem 
                                            key={fid} 
                                            onClick={() => addToFolder(image.id, fid)}
                                          >
                                            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: folder.color }} />
                                            <span className="truncate flex-1">{folder.name}</span>
                                            {folder.itemCount > 0 && (
                                              <span className="text-xs text-gray-500 ml-2">({folder.itemCount})</span>
                                            )}
                                          </DropdownMenuItem>
                                        );
                                      })
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                              
                              <DropdownMenuItem onClick={() => window.open(getImageUrl(image, false), "_blank")}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => setRenameModal({ open: true, image, name: displayName })}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Renombrar
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem className="text-red-600" onClick={() => deleteImage(image.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Mover a papelera
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Info de la imagen */}
                      <div className="p-3 bg-white border-t border-nuvia-silver/30">
                        <p className="text-sm font-medium truncate text-nuvia-deep mb-1">{displayName}</p>
                        <div className="flex justify-between items-center text-xs text-nuvia-deep/60">
                          <span>{formatFileSize(image.fileSize)}</span>
                          {image.width && image.height && (
                            <span>{image.width}×{image.height}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Paginación - Solo mostrar si hay más de una página */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-nuvia-silver/30 gap-4">
                <div className="text-sm text-nuvia-deep/60 text-center sm:text-left">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredImages.length)} de {filteredImages.length} imágenes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-nuvia-silver/30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 ${
                            currentPage === pageNum 
                              ? '' 
                              : 'border-nuvia-silver/30'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border-nuvia-silver/30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Vista Previa */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 border-0 bg-gradient-to-br from-nuvia-mauve/20 via-nuvia-rose/15 to-nuvia-peach/20 overflow-y-auto">
          {selectedImage && (
            <div className="flex flex-col md:flex-row min-h-full">
              {/* Imagen */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[40vh] md:min-h-[60vh]">
                <img
                  src={getImageUrl(selectedImage, false)}
                  alt={selectedImage.title || selectedImage.originalFilename}
                  className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain rounded-xl"
                  onError={(e) => { e.currentTarget.src = getImageUrl(selectedImage, true); }}
                />
              </div>
              
              {/* Panel info */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-nuvia-silver/30 bg-white/95 backdrop-blur-sm">
                {/* Header con botón cerrar */}
                <div className="p-4 border-b border-nuvia-silver/30 flex items-start justify-between sticky top-0 bg-white/95 z-10">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-semibold text-nuvia-deep break-words">
                      {selectedImage.title || selectedImage.originalFilename}
                    </h3>
                    {selectedImage.title && selectedImage.title !== selectedImage.originalFilename && (
                      <p className="text-sm text-nuvia-deep/60 mt-1 break-words">Original: {selectedImage.originalFilename}</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedImage(null)} 
                    className="flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Contenido scrolleable */}
                <div className="p-4 space-y-4">
                  {/* Archivo */}
                  <div className="bg-white/50 p-3 rounded-xl space-y-2 text-sm">
                    <h4 className="font-semibold text-nuvia-deep">Archivo</h4>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Tamaño</span>
                      <span>{formatFileSize(selectedImage.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Tipo</span>
                      <span className="capitalize">{selectedImage.mimeType?.split("/")[1]}</span>
                    </div>
                    {selectedImage.width && selectedImage.height && (
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/60">Dimensiones</span>
                        <span>{selectedImage.width} × {selectedImage.height} px</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Metadatos */}
                  <div className="bg-white/50 p-3 rounded-xl space-y-2 text-sm">
                    <h4 className="font-semibold text-nuvia-deep flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Metadatos
                    </h4>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Subida</span>
                      <span>{new Date(selectedImage.createdAt).toLocaleDateString("es-ES")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Estado</span>
                      <span className="flex items-center gap-1">
                        {selectedImage.isFavorite ? (
                          <>
                            <Heart className="w-3 h-3 text-red-500 fill-current" />
                            Favorita
                          </>
                        ) : (
                          "Normal"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Visibilidad</span>
                      <span className="flex items-center gap-1">
                        {selectedImage.isPublic ? (
                          <>
                            <Eye className="w-3 h-3 text-green-500" />
                            Pública
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-nuvia-deep/40" />
                            Privada
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-nuvia-deep">Acciones</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start border-nuvia-silver/30" 
                      onClick={() => window.open(getImageUrl(selectedImage, false), "_blank")}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start border-nuvia-silver/30" 
                      onClick={() => { 
                        setSelectedImage(null); 
                        setRenameModal({ open: true, image: selectedImage, name: selectedImage.title || selectedImage.originalFilename }); 
                      }}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Renombrar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start text-red-600 hover:bg-red-50 border-nuvia-silver/30" 
                      onClick={() => deleteImage(selectedImage.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Mover a papelera
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Renombrar */}
      <Dialog open={renameModal.open} onOpenChange={(open) => !open && setRenameModal({ open: false, image: null, name: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-nuvia-mauve" />
              Renombrar imagen
            </DialogTitle>
            <DialogDescription>Cambia el nombre de tu imagen.</DialogDescription>
          </DialogHeader>
          {renameModal.image && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-nuvia-silver/10 rounded-lg border border-nuvia-silver/30">
                <img src={getImageUrl(renameModal.image, true)} alt="" className="w-12 h-12 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-nuvia-deep">{renameModal.image.title || renameModal.image.originalFilename}</p>
                  <p className="text-xs text-nuvia-deep/60">{formatFileSize(renameModal.image.fileSize)}</p>
                </div>
              </div>
              <Input
                value={renameModal.name}
                onChange={(e) => setRenameModal(p => ({ ...p, name: e.target.value }))}
                placeholder="Nuevo nombre..."
                autoFocus
                className="border-nuvia-silver/30"
                onKeyDown={(e) => e.key === "Enter" && renameImage()}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModal({ open: false, image: null, name: "" })} disabled={isRenaming} className="border-nuvia-silver/30">
              Cancelar
            </Button>
            <Button onClick={renameImage} disabled={!renameModal.name.trim() || isRenaming} className="bg-nuvia-mauve hover:bg-nuvia-mauve/90 text-white">
              {isRenaming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Renombrando...
                </>
              ) : (
                "Renombrar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}