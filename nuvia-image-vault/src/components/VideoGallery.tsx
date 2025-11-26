// src/components/VideoGallery/VideoGallery.tsx
import { useState, useEffect, useRef } from 'react';
import { useVideos } from '@/hooks/useVideos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  MoreVertical,
  Download,
  Eye,
  EyeOff,
  Calendar,
  Trash2,
  FolderPlus,
  X,
  FileVideo
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
} from '@/components/ui/dialog';
import { apiService } from '@/services/api.services';

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
  const [itemsPerPage] = useState(20);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  
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

  // Función para añadir video a carpeta
  const addToFolder = async (videoId: number, folderId: number) => {
    if (folderId === undefined || folderId === null || isNaN(folderId)) {
      alert("Error: ID de carpeta inválido.");
      return;
    }

    try {
      const response = await apiService.post(`/folders/${folderId}/videos`, {
        videoId: videoId
      });
      
      if (response.success) {
        alert("Video añadido a la carpeta correctamente");
      } else {
        throw new Error(response.error || 'Error al añadir video a la carpeta');
      }
    } catch (error: any) {
      console.error("Error añadiendo video a carpeta:", error);
      alert(error.response?.data?.error || "Error al añadir video a la carpeta");
    }
  };

  const handleFavoriteToggle = async (videoId: number) => {
    try {
      await videoApi.toggleFavorite(videoId);
      refetch();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // 🔥 FUNCIÓN CORREGIDA CON AUTENTICACIÓN
  const handleSoftDelete = async (videoId: number) => {
    if (!confirm('¿Seguro que quieres mover este video a la papelera?')) return;

    try {
      // ✅ OBTENER TOKEN DEL LOCALSTORAGE
      const token = localStorage.getItem('authToken');

      if (!token) {
        alert('No estás autenticado. Por favor inicia sesión.');
        return;
      }

      const res = await fetch(`http://localhost:8080/api/videos/${videoId}/soft-delete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ ENVIAR TOKEN JWT
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al mover el video a la papelera');
      }

      alert(data.message || 'Video movido a la papelera correctamente');
      refetch(); // actualiza la lista de videos
    } catch (err: any) {
      console.error('Error en soft delete:', err);
      alert(err.message || 'No se pudo mover el video a la papelera');
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

  // Filtrar videos según búsqueda y favoritos - ÚNICA DECLARACIÓN
  const filteredVideos = videos.filter(video => {
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

  // Componente VideoCard unificado
  const VideoCard = ({ video }: { video: Video }) => {
    const [thumbnailError, setThumbnailError] = useState(false);
    const [thumbnailLoading, setThumbnailLoading] = useState(true);
    const [showControls, setShowControls] = useState(false);

    const thumbnailUrl = getThumbnailUrl(video);
    const videoUrl = getVideoUrl(video);

    const handleThumbnailLoad = () => {
      setThumbnailLoading(false);
      setThumbnailError(false);
    };

    const handleThumbnailError = () => {
      setThumbnailLoading(false);
      setThumbnailError(true);
    };

    const handleMouseEnter = () => setShowControls(true);
    const handleMouseLeave = () => setShowControls(false);

    // Si no hay URL válida, mostrar error
    if (!videoUrl) {
      return (
        <Card className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="aspect-square flex flex-col items-center justify-center bg-red-50">
              <FileVideo className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-red-600 text-xs font-medium">Error en video</p>
            </div>
            <div className="p-3 bg-white border-t border-nuvia-silver/30">
              <p className="text-sm font-medium truncate text-nuvia-deep mb-1">
                {video.title || video.originalFilename || 'Video no disponible'}
              </p>
              <div className="text-xs text-nuvia-deep/60">
                <p>Formato no disponible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
        <CardContent className="p-0 relative">
          {/* Video Thumbnail clickeable para abrir modal */}
          <div 
            className="aspect-square bg-gray-50 relative overflow-hidden cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => setSelectedVideo(video)}
          >
            {/* Loading state */}
            {thumbnailLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nuvia-mauve mx-auto mb-1"></div>
                  <p className="text-nuvia-deep/60 text-xs">Cargando...</p>
                </div>
              </div>
            )}

            {/* Thumbnail - CORREGIDO */}
            <img
              src={thumbnailUrl}
              alt={video.title || video.originalFilename}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onLoad={handleThumbnailLoad}
              onError={handleThumbnailError}
            />

            {/* Overlay de controles */}
            <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center ${
              showControls ? 'bg-black/30' : 'bg-black/0 group-hover:bg-black/20'
            }`}>
              <div className={`transform transition-all duration-300 ${
                showControls ? 'scale-110' : 'scale-100'
              }`}>
                <Play className="w-10 h-10 text-white fill-current opacity-90" />
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
                    <MoreVertical className="w-3 h-3" />
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
              {video.title || video.originalFilename || `Video ${video.videoId}`}
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
  };

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
      {loading && videos.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-nuvia-silver/30 rounded-2xl mb-4" />
              <div className="h-4 bg-nuvia-silver/30 rounded mb-2" />
              <div className="h-3 bg-nuvia-silver/30 rounded w-2/3" />
            </div>
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
        <div className={
          currentViewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {paginatedVideos.map((video) => (
            <VideoCard
              key={video.videoId}
              video={video}
            />
          ))}
        </div>
      )}

      {/* Modal Vista Previa - UNIFICADO */}
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
    </div>
  );
};