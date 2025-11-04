import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart,
  Star,
  Download,
  Share2,
  Search,
  Filter,
  MoreVertical,
  Image,
  Video,
  FileText,
  Trash2,
  ZoomIn,
  Play,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/api.services";
import { API_CONFIG } from "@/config/api.config";

interface FavoriteImage {
  id: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  thumbnailPath: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  isFavorite: boolean;
  uploadDate: string;
  takenDate: string | null;
  location: string | null;
  type: 'image';
}

interface FavoriteVideo {
  id: number;
  title: string;
  originalFilename: string;
  filename: string;
  videoPath: string;
  thumbnailPath: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  width: number;
  height: number;
  isFavorite: boolean;
  uploadDate: string;
  recordedDate: string | null;
  location: string | null;
  type: 'video';
}

type FavoriteItem = FavoriteImage | FavoriteVideo;

const Favorites = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<FavoriteItem | null>(null);
  const [processingAction, setProcessingAction] = useState<number | null>(null);

  // Helper para obtener URL de archivo
  const getMediaUrl = (filePath: string): string => {
    let cleanPath = filePath;
    if (filePath.startsWith("uploads/")) {
      cleanPath = filePath.replace("uploads/", "");
    }
    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
  };

  // Helper para obtener URL del thumbnail
  const getThumbnailUrl = (thumbnailPath: string | null, filePath: string): string => {
    if (thumbnailPath) {
      let cleanPath = thumbnailPath;
      if (thumbnailPath.startsWith("uploads/")) {
        cleanPath = thumbnailPath.replace("uploads/", "");
      }
      return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
    }
    return getMediaUrl(filePath);
  };

  // Helper para formatear tamaño
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Helper para formatear duración de video
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cargar favoritos (imágenes y videos)
  const fetchFavorites = async () => {
    try {
      setLoading(true);
      
      // Obtener imágenes favoritas
      const imagesResponse = await apiService.get('/images?favorites=true');
      const images: FavoriteImage[] = (imagesResponse.data || []).map((img: any) => ({
        ...img,
        type: 'image' as const
      }));

      // Obtener videos favoritas - usando la ruta correcta
      const videosResponse = await apiService.get('/videos?favorites=true');
      const videos: FavoriteVideo[] = (videosResponse.data || []).map((vid: any) => ({
        ...vid,
        type: 'video' as const
      }));

      // Combinar y ordenar por fecha
      const allFavorites = [...images, ...videos].sort((a, b) => 
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );

      setFavorites(allFavorites);
      setError(null);
    } catch (err) {
      setError('Error al cargar los favoritos');
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quitar de favoritos
  const removeFromFavorites = async (item: FavoriteItem) => {
    try {
      setProcessingAction(item.id);
      
      if (item.type === 'image') {
        // Para imágenes: POST /images/:id/favorite
        await apiService.post(`/images/${item.id}/favorite`);
      } else {
        // Para videos: PATCH /videos/:id/favorite (según tus rutas)
        await apiService.patch(`/videos/${item.id}/favorite`);
      }
      
      // Actualizar lista local
      setFavorites(prev => prev.filter(fav => fav.id !== item.id));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  // Limpiar todos los favoritos
  const clearAllFavorites = async () => {
    try {
      setProcessingAction(-1);
      
      // Quitar favoritos uno por uno
      const promises = favorites.map(item => {
        if (item.type === 'image') {
          return apiService.post(`/images/${item.id}/favorite`);
        } else {
          return apiService.patch(`/videos/${item.id}/favorite`);
        }
      });
      
      await Promise.all(promises);
      setFavorites([]);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  // Descargar archivo
  const downloadMedia = async (item: FavoriteItem) => {
    try {
      const mediaUrl = item.type === 'image' 
        ? getMediaUrl(item.imagePath)
        : getMediaUrl(item.videoPath);
        
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.originalFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  };

  // Mover a papelera
  const moveToTrash = async (item: FavoriteItem) => {
    try {
      setProcessingAction(item.id);
      
      if (item.type === 'image') {
        // Para imágenes: DELETE /images/:id (soft delete)
        await apiService.delete(`/images/${item.id}`);
      } else {
        // Para videos: PATCH /videos/:id/soft-delete
        await apiService.patch(`/videos/${item.id}/soft-delete`);
      }
      
      // Actualizar lista local
      setFavorites(prev => prev.filter(fav => fav.id !== item.id));
    } catch (error) {
      console.error('Error moving to trash:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const filteredFavorites = favorites.filter((favorite) => {
    const matchesSearch = favorite.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (favorite.title && favorite.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === "all" || favorite.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: favorites.length,
    images: favorites.filter(f => f.type === 'image').length,
    videos: favorites.filter(f => f.type === 'video').length,
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-nuvia-mauve border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-nuvia-mauve">Cargando favoritos...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchFavorites} variant="outline">
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold idebar-background text-white font-bold bg-clip-text text-transparent">
              Favoritos
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Tus archivos más importantes y destacados
            </p>
          </div>
          {favorites.length > 0 && (
            <Button 
              className="gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all"
              onClick={clearAllFavorites}
              disabled={processingAction === -1}
            >
              <Heart className="w-5 h-5" />
              {processingAction === -1 ? "Limpiando..." : "Limpiar Favoritos"}
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Total Favoritos</p>
                <Heart className="w-5 h-5 text-nuvia-rose" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-rose/10 border border-nuvia-rose/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Imágenes</p>
                <Image className="w-5 h-5 text-nuvia-peach" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.images}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-mauve/10 border border-nuvia-mauve/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Vídeos</p>
                <Video className="w-5 h-5 text-nuvia-mauve" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.videos}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-deep/10 border border-nuvia-deep/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Espacio usado</p>
                <FileText className="w-5 h-5 text-nuvia-silver" />
              </div>
              <p className="text-lg font-bold mt-2 text-nuvia-deep">
                {formatFileSize(favorites.reduce((acc, fav) => acc + fav.fileSize, 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuvia-mauve" />
            <Input
              placeholder="Buscar favoritos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve focus:ring-nuvia-mauve/20 transition-all duration-smooth"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-nuvia-rose via-nuvia-peach to-nuvia-mauve text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all">
                <Filter className="w-5 h-5" />
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
              <DropdownMenuItem onClick={() => setFilterType("all")}>Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("image")}>Imágenes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("video")}>Vídeos</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Favorites List */}
        <Card className="bg-white/95 backdrop-blur-sm rounded-2xl border border-nuvia-peach/20 shadow-nuvia-medium">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-nuvia-peach/30 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                  <tr>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve">Archivo</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden sm:table-cell">Tamaño</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden md:table-cell">Fecha</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden lg:table-cell">Detalles</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFavorites.map((favorite) => (
                    <tr
                      key={`${favorite.type}-${favorite.id}`}
                      className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center overflow-hidden">
                            <img
                              src={getThumbnailUrl(
                                favorite.thumbnailPath, 
                                favorite.type === 'image' ? favorite.imagePath : favorite.videoPath
                              )}
                              alt={favorite.originalFilename}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                            {favorite.type === 'video' && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-nuvia-deep truncate">
                              {favorite.title || favorite.originalFilename}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  favorite.type === 'image' 
                                    ? 'border-nuvia-peach text-nuvia-peach' 
                                    : 'border-nuvia-mauve text-nuvia-mauve'
                                }`}
                              >
                                {favorite.type === 'image' ? 'Imagen' : 'Video'}
                              </Badge>
                              <p className="text-xs text-nuvia-mauve sm:hidden">
                                {formatFileSize(favorite.fileSize)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-nuvia-mauve hidden sm:table-cell">
                        {formatFileSize(favorite.fileSize)}
                      </td>
                      <td className="p-4 text-nuvia-mauve hidden md:table-cell">
                        {new Date(favorite.uploadDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-nuvia-mauve hidden lg:table-cell">
                        {favorite.type === 'image' 
                          ? `${favorite.width} × ${favorite.height}`
                          : `${favorite.width} × ${favorite.height} • ${formatDuration(favorite.duration)}`
                        }
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve"
                                onClick={() => setSelectedMedia(favorite)}
                              >
                                {favorite.type === 'image' ? (
                                  <ZoomIn className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh]">
                              <div className="relative">
                                {favorite.type === 'image' ? (
                                  <img
                                    src={getMediaUrl(favorite.imagePath)}
                                    alt={favorite.originalFilename}
                                    className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                                  />
                                ) : (
                                  <video
                                    controls
                                    className="w-full h-auto max-h-[80vh] rounded-lg"
                                  >
                                    <source src={getMediaUrl(favorite.videoPath)} type={favorite.mimeType} />
                                    Tu navegador no soporta el elemento de video.
                                  </video>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve"
                                disabled={processingAction === favorite.id}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                              <DropdownMenuItem onClick={() => downloadMedia(favorite)}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="w-4 h-4 mr-2" />
                                Compartir
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => removeFromFavorites(favorite)}
                                disabled={processingAction === favorite.id}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {processingAction === favorite.id ? "Quitando..." : "Quitar de favoritos"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => moveToTrash(favorite)}
                                disabled={processingAction === favorite.id}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {processingAction === favorite.id ? "Moviendo..." : "Mover a papelera"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredFavorites.length === 0 && favorites.length > 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">No se encontraron favoritos con los filtros aplicados</p>
            </CardContent>
          </Card>
        )}

        {favorites.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Heart className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve mb-2">No tienes favoritos aún</p>
              <p className="text-sm text-nuvia-mauve/70">
                Marca algunas imágenes o videos como favoritos para verlos aquí
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;