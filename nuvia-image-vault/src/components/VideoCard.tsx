import { useState, useRef, useEffect } from 'react';
import { Video } from '@/services/videoApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_CONFIG } from '@/config/api.config';
import { 
  Play, 
  Pause, 
  Heart, 
  Clock, 
  MoreVertical,
  Trash2,
  AlertCircle,
  FileVideo,
  FolderPlus
} from 'lucide-react';
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
import { apiService } from '@/services/api.services';

interface VideoCardProps {
  video: Video;
  onFavoriteToggle: (videoId: number) => void;
  onDelete: (videoId: number) => void;
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

export const VideoCard = ({ video, onFavoriteToggle, onDelete }: VideoCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cargar carpetas del usuario
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setFoldersLoading(true);
        const response = await apiService.get('/folders');
        
        if (response.success && response.data) {
          // Filtrar solo las carpetas del usuario (no del sistema)
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
    // Validación robusta
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

  const getVideoUrl = () => {
    if (video.videoPath) {
      return buildUploadsUrl(video.videoPath);
    }

    if (video.userId && video.filename) {
      return buildUploadsUrl(`uploads/${video.userId}/videos/${video.filename}`);
    }

    return '';
  };

  const videoUrl = getVideoUrl();
  const thumbnailUrl = buildUploadsUrl(video.thumbnailPath);

  // Formatear duración de segundos a MM:SS
  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear tamaño del archivo
  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleVideoError = () => {
    setVideoError(true);
    setIsLoading(false);
  };

  const handleVideoLoad = () => {
    setVideoError(false);
    setIsLoading(false);
  };

  const handleVideoLoadStart = () => {
    setIsLoading(true);
  };

  const handleVideoCanPlay = () => {
    setIsLoading(false);
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (videoRef.current.readyState < 3) {
          setIsLoading(true);
        }
        await videoRef.current.play();
      }
    } catch (error) {
      setVideoError(true);
    }
  };

  const handleMouseEnter = () => setShowControls(true);
  const handleMouseLeave = () => setShowControls(false);

  const testVideoUrl = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  // Si no hay URL válida, mostrar error directamente
  if (!videoUrl) {
    return (
      <Card className="border-nuvia-silver/30 bg-gradient-to-br from-white/80 to-nuvia-silver/10 rounded-2xl">
        <CardContent className="p-0">
          <div className="aspect-video flex flex-col items-center justify-center bg-red-50 rounded-t-2xl">
            <FileVideo className="w-12 h-12 text-red-400 mb-2" />
            <p className="text-red-600 text-sm font-medium">Error en datos del video</p>
            <p className="text-red-500 text-xs mt-1">ID: {video.videoId}</p>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-nuvia-deep text-sm line-clamp-2 mb-2">
              {video.title || video.originalFilename || 'Video no disponible'}
            </h3>
            <div className="text-xs text-nuvia-deep/60 space-y-1">
              <p>UserId: {video.userId || 'N/A'}</p>
              <p>Filename: {video.filename || 'N/A'}</p>
              <p>VideoPath: {video.videoPath || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden border-nuvia-silver/30 bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all duration-300">
      <CardContent className="p-0">
        {/* Video Thumbnail/Player */}
        <div 
          className="relative aspect-video bg-gradient-to-br from-nuvia-deep/10 to-nuvia-mauve/5 rounded-t-2xl overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
              <div className="text-center">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
                <p className="text-red-600 font-medium text-sm mb-1">Error cargando video</p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setVideoError(false);
                      setIsLoading(true);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                    className="text-xs h-8"
                  >
                    Reintentar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testVideoUrl}
                    className="text-xs h-8"
                  >
                    Probar URL
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Loading state */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-t-2xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nuvia-mauve mx-auto mb-2"></div>
                    <p className="text-nuvia-deep/60 text-xs">Cargando video...</p>
                  </div>
                </div>
              )}

              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleVideoError}
                onLoadedData={handleVideoLoad}
                onLoadStart={handleVideoLoadStart}
                onCanPlay={handleVideoCanPlay}
                preload="metadata"
                poster={thumbnailUrl || undefined}
                controls={false}
                muted
                playsInline
              >
                <source src={videoUrl} type={video.mimeType || 'video/mp4'} />
                Tu navegador no soporta el elemento video.
              </video>

              {/* Overlay de controles */}
              <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center ${
                showControls || isLoading ? 'bg-black/20' : 'bg-black/0 group-hover:bg-black/10'
              }`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white transition-all duration-300 hover:bg-white/30 hover:scale-110 ${
                    (showControls || isLoading) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={handlePlayPause}
                  disabled={isLoading || videoError}
                >
                  {isLoading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {/* Badges superiores */}
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge variant="secondary" className="bg-black/60 text-white border-0 text-xs">
                  {video.codec || 'MP4'}
                </Badge>
                {video.isFavorite && (
                  <Badge variant="secondary" className="bg-red-500/80 text-white border-0">
                    <Heart className="w-3 h-3 fill-current" />
                  </Badge>
                )}
              </div>

              {/* Duración */}
              <div className="absolute bottom-3 right-3">
                <Badge variant="secondary" className="bg-black/60 text-white border-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDuration(video.duration)}
                </Badge>
              </div>

              {/* Progress Bar */}
              {isPlaying && video.duration && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                  <div 
                    className="h-full bg-gradient-to-r from-nuvia-mauve to-nuvia-rose transition-all duration-100"
                    style={{ 
                      width: `${(currentTime / video.duration) * 100}%` 
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Información del video */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-nuvia-deep text-sm line-clamp-2 flex-1 mr-2">
              {video.title || video.originalFilename || `Video ${video.videoId}`}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-nuvia-deep/60 hover:text-red-500 transition-colors"
                onClick={() => onFavoriteToggle(video.videoId)}
              >
                <Heart 
                  className={`w-4 h-4 transition-all ${
                    video.isFavorite ? 'fill-red-500 text-red-500 scale-110' : ''
                  }`} 
                />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-nuvia-deep/60 hover:text-nuvia-deep"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onFavoriteToggle(video.videoId)}>
                    <Heart className={`w-4 h-4 mr-2 ${video.isFavorite ? "text-red-500 fill-current" : ""}`} />
                    {video.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                  </DropdownMenuItem>
                  
                  {/* Submenú para añadir a carpeta */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center">
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
                            // Obtener el ID correcto de la carpeta
                            const actualFolderId = folder.folderId || folder.id;

                            // Validar que el ID sea válido
                            if (!actualFolderId || isNaN(actualFolderId)) {
                              return null;
                            }

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
                                  <Badge variant="secondary" className="text-xs ml-2">
                                    {folder.itemCount}
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                            );
                          }).filter(Boolean) // Filtrar elementos nulos
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(video.videoId)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-1 text-xs text-nuvia-deep/60">
            <div className="flex justify-between">
              <span>Tamaño:</span>
              <span className="font-medium">{formatFileSize(video.fileSize)}</span>
            </div>
            <div className="flex justify-between">
              <span>Resolución:</span>
              <span className="font-medium">
                {video.width && video.height ? `${video.width}x${video.height}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Subido:</span>
              <span className="font-medium">
                {new Date(video.createdAt).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};