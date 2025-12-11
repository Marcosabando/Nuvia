// src/components/VideoGallery/VideoGallery.tsx
import { useState, useEffect, useRef } from 'react';
import { useVideos } from '@/hooks/useVideos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Grid3X3, 
  List, 
  Search, 
  Filter,
  RefreshCw,
  Upload,
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
  Clock,
  MoreHorizontal,
  Download,
  Eye,
  EyeOff,
  Calendar,
  Trash2,
  FolderPlus,
  X,
  FileVideo,
  Edit3
} from 'lucide-react';
import { videoApi } from '@/services/videoApi';
import { Video } from '@/services/videoApi';
import { API_CONFIG } from '@/config/api.config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiService } from '@/services/api.services';
import { useToast } from '@/hooks/use-toast';

interface VideoGalleryProps {
  viewMode?: 'grid' | 'list';
}

interface Folder {
  id: number;
  folderId?: number;
  name: string;
  description?: string;
  color: string;
  isSystem: boolean;
  itemCount: number;
  createdAt: string;
}

export const VideoGallery = ({ viewMode = 'grid' }: VideoGalleryProps) => {
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'list'>(viewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // 5 columnas × 4 filas = 20 videos por página
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<number, any>>({});
  const [renameModal, setRenameModal] = useState<{ open: boolean; video: Video | null; name: string }>({
    open: false, video: null, name: ""
  });
  const [isRenaming, setIsRenaming] = useState(false);
  const { toast } = useToast();
  
  const { videos, loading, error, refetch } = useVideos();

  // Cargar carpetas del usuario
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setFoldersLoading(true);
        const response = await apiService.get('/folders');
        
        if (response.success && response.data) {
          const userFolders = response.data.filter((folder: Folder) => !folder.isSystem);
          setFolders(userFolders);
        }
      } catch (error) {
        console.error("Error cargando carpetas:", error);
      } finally {
        setFoldersLoading(false);
      }
    };

    fetchFolders();
  }, []);

  // Función para mostrar toasts
  const showToast = (success: boolean, message: string) => {
    toast({
      title: success ? "✅ Éxito" : "❌ Error",
      description: message,
      ...(success ? { className: "bg-green-50 border-green-200 text-green-800" } : { variant: "destructive" })
    });
  };

  // Función para añadir video a carpeta
  const addToFolder = async (videoId: number, folderId: number) => {
    if (folderId === undefined || folderId === null || isNaN(folderId)) {
      showToast(false, "ID de carpeta inválido.");
      return;
    }

    try {
      const response = await apiService.post(`/folders/${folderId}/videos`, {
        videoId: videoId
      });
      
      if (response.success) {
        showToast(true, "Video añadido a la carpeta correctamente");
      } else {
        throw new Error(response.error || 'Error al añadir video a la carpeta');
      }
    } catch (error: any) {
      console.error("Error añadiendo video a carpeta:", error);
      showToast(false, error.response?.data?.error || "Error al añadir video a la carpeta");
    }
  };

  const handleFavoriteToggle = async (videoId: number) => {
    const current = videos.find(video => video.videoId === videoId)?.isFavorite;
    setOptimisticUpdates(p => ({ ...p, [videoId]: { isFavorite: !current } }));
    
    try {
      await videoApi.toggleFavorite(videoId);
      refetch();
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setOptimisticUpdates(p => { const n = { ...p }; delete n[videoId]; return n; });
    }
  };

  // 🔥 FUNCIÓN CORREGIDA CON AUTENTICACIÓN
  const handleSoftDelete = async (videoId: number) => {
    if (!confirm('¿Seguro que quieres mover este video a la papelera?')) return;

    setOptimisticUpdates(p => ({ ...p, [videoId]: { deleted: true } }));
    setSelectedVideo(null);
    
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        showToast(false, 'No estás autenticado. Por favor inicia sesión.');
        setOptimisticUpdates(p => { const n = { ...p }; delete n[videoId]; return n; });
        return;
      }

      const res = await fetch(`http://localhost:8080/api/videos/${videoId}/soft-delete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al mover el video a la papelera');
      }

      showToast(true, data.message || 'Video movido a la papelera correctamente');
      refetch();
    } catch (err: any) {
      console.error('Error en soft delete:', err);
      showToast(false, err.message || 'No se pudo mover el video a la papelera');
      setOptimisticUpdates(p => { const n = { ...p }; delete n[videoId]; return n; });
    }
  };

  // Función para renombrar video
  const renameVideo = async () => {
    if (!renameModal.name.trim() || !renameModal.video) {
      showToast(false, "El nombre no puede estar vacío");
      return;
    }
    
    setIsRenaming(true);
    try {
      const response = await apiService.patch(`/videos/${renameModal.video.videoId}/title`, { 
        title: renameModal.name.trim() 
      });
      
      if (response.success) {
        showToast(true, "Video renombrado correctamente");
        setRenameModal({ open: false, video: null, name: "" });
        refetch();
      } else {
        throw new Error(response.error || 'Error al renombrar video');
      }
    } catch (error: any) {
      console.error("Error renombrando video:", error);
      showToast(false, error.response?.data?.error || "Error al renombrar video");
    } finally {
      setIsRenaming(false);
    }
  };

  // Función para construir URLs - CORREGIDA
  const buildUploadsUrl = (path?: string | null) => {
    if (!path) {
      return '';
    }
    if (path.startsWith('http')) {
      return path;
    }

    const cleanPath = path
      .replace(/^https?:\/\//, '')
      .replace(/^[\/]+/, '')
      .replace(/^uploads[\/]/i, '');

    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
  };

  // Obtener thumbnail URL - CORREGIDA
  const getThumbnailUrl = (video: Video) => {
    if (video.thumbnailPath) {
      return buildUploadsUrl(video.thumbnailPath);
    }
    
    // Si no hay thumbnail, usar una imagen por defecto
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f3f4f6' width='200' height='200'/%3E%3Cpath d='M80 60L120 80L80 100Z' fill='%239ca3af'/%3E%3Ctext x='50%25' y='85%25' text-anchor='middle' fill='%239ca3af' font-size='12'%3EVideo%3C/text%3E%3C/svg%3E";
  };

  // Obtener video URL - CORREGIDA
  const getVideoUrl = (video: Video) => {
    if (video.videoPath) {
      return buildUploadsUrl(video.videoPath);
    }

    if (video.userId && video.filename) {
      return buildUploadsUrl(`uploads/${video.userId}/videos/${video.filename}`);
    }

    return '';
  };

  // Función auxiliar para formatear
  const formatFileSize = (bytes: number): string => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtrar videos con updates optimistas
  const displayVideos = videos
    .filter(video => !optimisticUpdates[video.videoId]?.deleted)
    .map(video => ({ 
      ...video, 
      isFavorite: optimisticUpdates[video.videoId]?.isFavorite ?? video.isFavorite 
    }));

  // Filtrar videos según búsqueda y favoritos
  const filteredVideos = displayVideos.filter(video => {
    const matchesSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = !favoritesOnly || video.isFavorite;
    return matchesSearch && matchesFavorites;
  });

  // Paginación
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVideos = filteredVideos.slice(startIndex, startIndex + itemsPerPage);

  // Resetear página cuando cambian los filtros
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
                placeholder="Buscar videos..."
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
                  : 'bg-white/50'
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
              className="border-nuvia-silver/30"
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

        {/* Grid de Videos */}
        {loading && filteredVideos.length === 0 ? (
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
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-nuvia-peach/20 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-nuvia-mauve" />
            </div>
            <h3 className="text-lg font-semibold text-nuvia-deep mb-2">
              {videos.length === 0 ? 'No hay videos' : 'No se encontraron videos'}
            </h3>
            <p className="text-nuvia-deep/60 mb-4">
              {videos.length === 0 
                ? 'Comienza subiendo tu primer video'
                : 'Intenta con otros términos de búsqueda'
              }
            </p>
          </div>
        ) : (
          <>
            <div className={
              currentViewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
                : "space-y-4"
            }>
              {paginatedVideos.map(video => {
                const displayName = video.title || video.originalFilename;
                const videoUrl = getVideoUrl(video);
                
                if (currentViewMode === 'list') {
                  // Vista de lista
                  return (
                    <Card key={video.videoId} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Thumbnail pequeño a la izquierda */}
                          <div 
                            className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg relative overflow-hidden cursor-pointer"
                            onClick={() => setSelectedVideo(video)}
                          >
                            <img
                              src={getThumbnailUrl(video)}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-6 h-6 text-white fill-current" />
                            </div>
                            
                            {video.isFavorite && (
                              <div className="absolute top-1 left-1 z-10 pointer-events-none">
                                <div className="bg-red-500 rounded-md px-1 py-0.5 shadow-sm">
                                  <Heart className="w-2 h-2 text-white fill-current" />
                                </div>
                              </div>
                            )}
                            
                            {video.duration && (
                              <div className="absolute bottom-1 right-1">
                                <div className="bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                  {formatDuration(video.duration)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Información del video */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-nuvia-deep truncate mb-1">
                                  {displayName}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-nuvia-deep/60">
                                  <span>{formatFileSize(video.fileSize)}</span>
                                  {video.duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDuration(video.duration)}
                                    </span>
                                  )}
                                  <span className="capitalize">{video.mimeType?.split("/")[1] || 'MP4'}</span>
                                  {video.width && video.height && (
                                    <span>{video.width}×{video.height}</span>
                                  )}
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
                                    handleFavoriteToggle(video.videoId);
                                  }}
                                >
                                  <Heart className={`w-3 h-3 ${video.isFavorite ? "text-red-500 fill-current" : "text-gray-600"}`} />
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
                                    <DropdownMenuItem onClick={() => handleFavoriteToggle(video.videoId)}>
                                      <Heart className={`w-4 h-4 mr-2 ${video.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                      {video.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <FolderPlus className="w-4 h-4 mr-2" />
                                        Añadir a carpeta
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="w-48">
                                          {foldersLoading ? (
                                            <DropdownMenuItem disabled>
                                              <div className="flex items-center">
                                                <div className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                                Cargando carpetas...
                                              </div>
                                            </DropdownMenuItem>
                                          ) : folders.length === 0 ? (
                                            <DropdownMenuItem disabled>
                                              No tienes carpetas
                                            </DropdownMenuItem>
                                          ) : (
                                            folders.map((folder) => {
                                              const actualFolderId = folder.folderId || folder.id;
                                              if (!actualFolderId || isNaN(actualFolderId)) return null;

                                              return (
                                                <DropdownMenuItem
                                                  key={actualFolderId}
                                                  onClick={() => addToFolder(video.videoId, actualFolderId)}
                                                  className="flex items-center justify-between"
                                                >
                                                  <div className="flex items-center">
                                                    <div 
                                                      className="w-3 h-3 rounded mr-2"
                                                      style={{ backgroundColor: folder.color }}
                                                    />
                                                    <span className="truncate">{folder.name}</span>
                                                  </div>
                                                  {folder.itemCount > 0 && (
                                                    <span className="text-xs text-gray-500 ml-2">({folder.itemCount})</span>
                                                  )}
                                                </DropdownMenuItem>
                                              );
                                            }).filter(Boolean)
                                          )}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    
                                    <DropdownMenuItem onClick={() => window.open(videoUrl, "_blank")}>
                                      <Download className="w-4 h-4 mr-2" />
                                      Descargar
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => setRenameModal({ open: true, video, name: displayName })}>
                                      <Edit3 className="w-4 h-4 mr-2" />
                                      Renombrar
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleSoftDelete(video.videoId)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Mover a papelera
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            {/* Información adicional - Solo en desktop */}
                            <div className="hidden sm:flex items-center gap-4 text-xs text-nuvia-deep/60">
                              <span>Subido: {new Date(video.createdAt).toLocaleDateString("es-ES")}</span>
                              {video.isPublic ? (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3 text-green-500" />
                                  Público
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <EyeOff className="w-3 h-3 text-nuvia-deep/40" />
                                  Privado
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
                  <Card key={video.videoId} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                    <CardContent className="p-0 relative">
                      {/* Video Thumbnail clickeable */}
                      <div 
                        className="aspect-square bg-gray-50 relative overflow-hidden cursor-pointer" 
                        onClick={() => setSelectedVideo(video)}
                      >
                        <img
                          src={getThumbnailUrl(video)}
                          alt={displayName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                            <Play className="w-8 h-8 text-white fill-current" />
                          </div>
                        </div>
                        
                        {/* Badge favorito */}
                        {video.isFavorite && (
                          <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <div className="bg-red-500 rounded-md px-1.5 py-1 shadow-sm">
                              <Heart className="w-3 h-3 text-white fill-current" />
                            </div>
                          </div>
                        )}
                        
                        {/* Duración */}
                        {video.duration && (
                          <div className="absolute bottom-2 right-2">
                            <div className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatDuration(video.duration)}
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
                              handleFavoriteToggle(video.videoId);
                            }}
                          >
                            <Heart className={`w-3 h-3 ${video.isFavorite ? "text-red-500 fill-current" : "text-gray-600"}`} />
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
                              <DropdownMenuItem onClick={() => handleFavoriteToggle(video.videoId)}>
                                <Heart className={`w-4 h-4 mr-2 ${video.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                {video.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                              </DropdownMenuItem>
                              
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderPlus className="w-4 h-4 mr-2" />
                                  Añadir a carpeta
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent className="w-48">
                                    {foldersLoading ? (
                                      <DropdownMenuItem disabled>
                                        <div className="flex items-center">
                                          <div className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                          Cargando carpetas...
                                        </div>
                                      </DropdownMenuItem>
                                    ) : folders.length === 0 ? (
                                      <DropdownMenuItem disabled>
                                        No tienes carpetas
                                      </DropdownMenuItem>
                                    ) : (
                                      folders.map((folder) => {
                                        const actualFolderId = folder.folderId || folder.id;
                                        if (!actualFolderId || isNaN(actualFolderId)) return null;

                                        return (
                                          <DropdownMenuItem
                                            key={actualFolderId}
                                            onClick={() => addToFolder(video.videoId, actualFolderId)}
                                            className="flex items-center justify-between"
                                          >
                                            <div className="flex items-center">
                                              <div 
                                                className="w-3 h-3 rounded mr-2"
                                                style={{ backgroundColor: folder.color }}
                                              />
                                              <span className="truncate">{folder.name}</span>
                                            </div>
                                            {folder.itemCount > 0 && (
                                              <span className="text-xs text-gray-500 ml-2">({folder.itemCount})</span>
                                            )}
                                          </DropdownMenuItem>
                                        );
                                      }).filter(Boolean)
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                              
                              <DropdownMenuItem onClick={() => window.open(videoUrl, "_blank")}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => setRenameModal({ open: true, video, name: displayName })}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Renombrar
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem className="text-red-600" onClick={() => handleSoftDelete(video.videoId)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Mover a papelera
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Info del video */}
                      <div className="p-3 bg-white border-t border-nuvia-silver/30">
                        <p className="text-sm font-medium truncate text-nuvia-deep mb-1">
                          {displayName}
                        </p>
                        <div className="flex justify-between items-center text-xs text-nuvia-deep/60">
                          <span>{formatFileSize(video.fileSize)}</span>
                          {video.duration && (
                            <span>{formatDuration(video.duration)}</span>
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
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredVideos.length)} de {filteredVideos.length} videos
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
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 border-0 bg-gradient-to-br from-nuvia-mauve/20 via-nuvia-rose/15 to-nuvia-peach/20 overflow-y-auto">
          {selectedVideo && (
            <div className="flex flex-col md:flex-row min-h-full">
              {/* Video */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[40vh] md:min-h-[60vh]">
                <div className="w-full max-w-4xl">
                  <video
                    controls
                    autoPlay
                    className="w-full h-auto max-h-[70vh] rounded-xl shadow-2xl"
                    poster={getThumbnailUrl(selectedVideo)}
                  >
                    <source src={getVideoUrl(selectedVideo)} type={selectedVideo.mimeType || 'video/mp4'} />
                    Tu navegador no soporta el elemento video.
                  </video>
                </div>
              </div>
              
              {/* Panel info */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-nuvia-silver/30 bg-white/95 backdrop-blur-sm">
                {/* Header con botón cerrar */}
                <div className="p-4 border-b border-nuvia-silver/30 flex items-start justify-between sticky top-0 bg-white/95 z-10">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-semibold text-nuvia-deep break-words">
                      {selectedVideo.title || selectedVideo.originalFilename}
                    </h3>
                    {selectedVideo.title && selectedVideo.title !== selectedVideo.originalFilename && (
                      <p className="text-sm text-nuvia-deep/60 mt-1 break-words">Original: {selectedVideo.originalFilename}</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedVideo(null)} 
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
                      <span>{formatFileSize(selectedVideo.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Duración</span>
                      <span>{formatDuration(selectedVideo.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Formato</span>
                      <span className="capitalize">{selectedVideo.mimeType?.split("/")[1] || 'MP4'}</span>
                    </div>
                    {selectedVideo.width && selectedVideo.height && (
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/60">Resolución</span>
                        <span>{selectedVideo.width} × {selectedVideo.height} px</span>
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
                      <span>{new Date(selectedVideo.createdAt).toLocaleDateString("es-ES")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Estado</span>
                      <span className="flex items-center gap-1">
                        {selectedVideo.isFavorite ? (
                          <>
                            <Heart className="w-3 h-3 text-red-500 fill-current" />
                            Favorito
                          </>
                        ) : (
                          "Normal"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Visibilidad</span>
                      <span className="flex items-center gap-1">
                        {selectedVideo.isPublic ? (
                          <>
                            <Eye className="w-3 h-3 text-green-500" />
                            Público
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-nuvia-deep/40" />
                            Privado
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
                      onClick={() => window.open(getVideoUrl(selectedVideo), "_blank")}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start border-nuvia-silver/30" 
                      onClick={() => setRenameModal({ open: true, video: selectedVideo, name: selectedVideo.title || selectedVideo.originalFilename })}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Renombrar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start border-nuvia-silver/30" 
                      onClick={() => handleFavoriteToggle(selectedVideo.videoId)}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${selectedVideo.isFavorite ? "text-red-500 fill-current" : ""}`} />
                      {selectedVideo.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start text-red-600 hover:bg-red-50 border-nuvia-silver/30" 
                      onClick={() => {
                        setSelectedVideo(null);
                        handleSoftDelete(selectedVideo.videoId);
                      }}
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
      <Dialog open={renameModal.open} onOpenChange={(open) => !open && setRenameModal({ open: false, video: null, name: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-nuvia-mauve" />
              Renombrar video
            </DialogTitle>
            <DialogDescription>Cambia el nombre de tu video.</DialogDescription>
          </DialogHeader>
          {renameModal.video && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-nuvia-silver/10 rounded-lg border border-nuvia-silver/30">
                <img src={getThumbnailUrl(renameModal.video)} alt="" className="w-12 h-12 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-nuvia-deep">{renameModal.video.title || renameModal.video.originalFilename}</p>
                  <p className="text-xs text-nuvia-deep/60">
                    {formatFileSize(renameModal.video.fileSize)} • {formatDuration(renameModal.video.duration)}
                  </p>
                </div>
              </div>
              <Input
                value={renameModal.name}
                onChange={(e) => setRenameModal(p => ({ ...p, name: e.target.value }))}
                placeholder="Nuevo nombre..."
                autoFocus
                className="border-nuvia-silver/30"
                onKeyDown={(e) => e.key === "Enter" && renameVideo()}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModal({ open: false, video: null, name: "" })} disabled={isRenaming} className="border-nuvia-silver/30">
              Cancelar
            </Button>
            <Button onClick={renameVideo} disabled={!renameModal.name.trim() || isRenaming} className="bg-nuvia-mauve hover:bg-nuvia-mauve/90 text-white">
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
};