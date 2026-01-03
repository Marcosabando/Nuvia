import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart,
  Download,
  Search,
  Filter,
  MoreVertical,
  Image,
  Video,
  FileText,
  Trash2,
  Eye,
  X,
  Play,
  Calendar,
  Maximize2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiService } from "@/services/api.services";
import { API_CONFIG } from "@/config/api.config";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface BaseFavorite {
  id: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  isFavorite: boolean;
}

interface FavoriteImage extends BaseFavorite {
  imageId: number;
  imagePath: string;
  type: 'image';
}

interface FavoriteVideo extends BaseFavorite {
  videoId: number;
  videoPath: string;
  type: 'video';
}

type FavoriteItem = FavoriteImage | FavoriteVideo;

const Favorites = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FavoriteItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingRemove, setLoadingRemove] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const imagesResponse = await apiService.get('/images?favorites=true');
        const videosResponse = await apiService.get('/videos?favorites=true');
        const allFavorites: FavoriteItem[] = [];

        if (imagesResponse.success && imagesResponse.data) {
          const images = imagesResponse.data.map((img: any): FavoriteImage => ({
            id: img.imageId,
            imageId: img.imageId,
            userId: img.userId,
            title: img.title,
            originalFilename: img.originalFilename,
            filename: img.filename,
            imagePath: img.imagePath,
            thumbnailPath: img.thumbnailPath,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
            createdAt: img.createdAt,
            isFavorite: img.isFavorite,
            type: 'image'
          }));
          allFavorites.push(...images);
        }

        if (videosResponse.success && videosResponse.data) {
          const videos = videosResponse.data.map((vid: any): FavoriteVideo => ({
            id: vid.videoId,
            videoId: vid.videoId,
            userId: vid.userId,
            title: vid.title,
            originalFilename: vid.originalFilename,
            filename: vid.filename,
            videoPath: vid.videoPath,
            thumbnailPath: vid.thumbnailPath,
            fileSize: vid.fileSize,
            mimeType: vid.mimeType,
            createdAt: vid.createdAt,
            isFavorite: vid.isFavorite,
            type: 'video'
          }));
          allFavorites.push(...videos);
        }

        allFavorites.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setFavorites(allFavorites);
        
      } catch (err: any) {
        console.error("❌ Error cargando favoritos:", err);
        setError(err.message || "No se pudieron cargar los favoritos");
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  // 🔥 FUNCIÓN CORREGIDA - Usa el método correcto para cada tipo
  const removeFromFavorites = async (item: FavoriteItem) => {
    try {
      setLoadingRemove(item.id);
      
      let endpoint = '';
      let method = '';
      
      if (item.type === 'image') {
        // Para imágenes: POST /images/{id}/favorite
        endpoint = `/images/${item.id}/favorite`;
        method = 'POST';
      } else {
        // Para videos: PATCH /videos/{id}/favorite
        endpoint = `/videos/${item.id}/favorite`;
        method = 'PATCH';
      }
      
      console.log(`🗑️ Quitando de favoritos:`, { endpoint, method, item });
      
      // Usar el apiService si está configurado para diferentes métodos
      // o usar fetch directamente
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log("✅ Favorito removido:", result);
        
        // Actualizar estado local
        setFavorites(prev => prev.filter(fav => 
          !(fav.type === item.type && fav.id === item.id)
        ));
        
        // Cerrar modal si está abierto
        if (selectedFile && selectedFile.id === item.id && selectedFile.type === item.type) {
          setIsPreviewOpen(false);
          setSelectedFile(null);
        }
      } else {
        throw new Error(result.error || result.message || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error("❌ Error removiendo favorito:", error);
      alert(`Error al quitar de favoritos: ${error.message}`);
    } finally {
      setLoadingRemove(null);
    }
  };

  // 🔥 ALTERNATIVA usando apiService (si soporta diferentes métodos)
  const removeFromFavoritesAlt = async (item: FavoriteItem) => {
    try {
      setLoadingRemove(item.id);
      
      if (item.type === 'image') {
        // Usar apiService para POST
        const response = await apiService.post(`/images/${item.id}/favorite`);
        if (response.success) {
          handleSuccessRemoval(item);
        } else {
          throw new Error(response.error || 'Error al quitar de favoritos');
        }
      } else {
        // Para videos necesitamos usar PATCH, apiService puede no tenerlo
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_CONFIG.BASE_URL}/videos/${item.id}/favorite`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
          handleSuccessRemoval(item);
        } else {
          throw new Error(result.error || result.message || 'Error al quitar de favoritos');
        }
      }
    } catch (error: any) {
      console.error("❌ Error removiendo favorito:", error);
      alert(`Error al quitar de favoritos: ${error.message}`);
    } finally {
      setLoadingRemove(null);
    }
  };

  const handleSuccessRemoval = (item: FavoriteItem) => {
    // Actualizar estado local
    setFavorites(prev => prev.filter(fav => 
      !(fav.type === item.type && fav.id === item.id)
    ));
    
    // Cerrar modal si está abierto
    if (selectedFile && selectedFile.id === item.id && selectedFile.type === item.type) {
      setIsPreviewOpen(false);
      setSelectedFile(null);
    }
  };

  // 🔥 FUNCIÓN para quitar todos los favoritos
  const clearAllFavorites = async () => {
    try {
      if (!confirm("¿Estás seguro de que quieres quitar todos los archivos de favoritos?")) {
        return;
      }

      console.log("🧹 Limpiando todos los favoritos...");
      
      // Quitar cada favorito uno por uno
      for (const fav of favorites) {
        await removeFromFavorites(fav);
      }
      
      console.log("✅ Todos los favoritos removidos");
    } catch (error) {
      console.error("❌ Error limpiando favoritos:", error);
      alert("Error al limpiar favoritos");
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

  const getFileUrl = (item: FavoriteItem): string => {
    if (item.type === 'image') {
      return buildUploadsUrl((item as FavoriteImage).imagePath);
    } else {
      return buildUploadsUrl((item as FavoriteVideo).videoPath);
    }
  };

  const getThumbnailUrl = (item: FavoriteItem): string => {
    if (item.thumbnailPath) {
      return buildUploadsUrl(item.thumbnailPath);
    }
    
    if (item.type === 'image') {
      return getFileUrl(item);
    }
    
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f3f4f6' width='200' height='200'/%3E%3Cpath d='M80 60L120 80L80 100Z' fill='%239ca3af'/%3E%3Ctext x='50%25' y='85%25' text-anchor='middle' fill='%239ca3af' font-size='12'%3EVideo%3C/text%3E%3C/svg%3E";
  };

  const getThumbnailUrl = (item: FavoriteItem): string | null => {
    if (!item.thumbnailPath) return null;

    let cleanPath = item.thumbnailPath;
    if (cleanPath.startsWith("uploads/")) {
      cleanPath = cleanPath.replace("uploads/", "");
    }

    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
  };

  const handleFileClick = (file: FavoriteItem) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
    setIsFullscreen(false);
  };

  const handleDownload = (file: FavoriteItem) => {
    const fileUrl = getFileUrl(file);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Hace 1 día";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} semanas`;
    return `Hace ${Math.ceil(diffDays / 30)} meses`;
  };

  const filteredFavorites = favorites.filter((favorite) => {
    const matchesSearch = favorite.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
    const fileType = favorite.type;
    const matchesFilter = filterType === "all" || fileType === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: favorites.length,
    images: favorites.filter(fav => fav.type === 'image').length,
    videos: favorites.filter(fav => fav.type === 'video').length,
    documents: 0,
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white">Cargando favoritos...</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-white mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose">
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          {/* Header Section */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
                Favoritos
              </h1>
              <p className="text-sm sm:text-base text-white/80 mt-1">
                Tus archivos más importantes y destacados
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-nuvia-deep/70 font-medium">Total Favoritos</p>
                    <div className="p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                      <Heart className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.total}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-rose/10 border border-nuvia-rose/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-nuvia-deep/70 font-medium">Imágenes</p>
                    <div className="p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                      <Image className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.images}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-mauve/10 border border-nuvia-mauve/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-nuvia-deep/70 font-medium">Vídeos</p>
                    <div className="p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.videos}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-deep/10 border border-nuvia-deep/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-nuvia-deep/70 font-medium">Espacio usado</p>
                    <div className="p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                    {formatFileSize(favorites.reduce((acc, fav) => acc + fav.fileSize, 0))}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve" />
                <Input
                  placeholder="Buscar favoritos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 border-nuvia-silver/30"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 bg-white/80 border-nuvia-silver/30 text-nuvia-mauve hover:bg-white">
                    <Filter className="w-4 h-4" />
                    Filtrar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-white/95 backdrop-blur-sm rounded-xl">
                  <DropdownMenuItem onClick={() => setFilterType("all")}>Todos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("image")}>Imágenes</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("video")}>Vídeos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {favorites.length > 0 && (
              <Button 
                onClick={clearAllFavorites}
                className="gap-2 bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white whitespace-nowrap"
                disabled={loadingRemove !== null}
              >
                {loadingRemove !== null ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4" />
                    Limpiar Favoritos
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Favorites List */}
          <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="w-full">
                {/* Header de la tabla */}
                <div className="hidden sm:grid grid-cols-12 gap-4 border-b border-nuvia-peach/30 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4">
                  <div className="col-span-6 lg:col-span-5 font-semibold text-nuvia-mauve">Archivo</div>
                  <div className="col-span-2 font-semibold text-nuvia-mauve">Tamaño</div>
                  <div className="col-span-2 font-semibold text-nuvia-mauve hidden md:block">Fecha</div>
                  <div className="col-span-2 font-semibold text-nuvia-mauve hidden lg:block">Tipo</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Lista de favoritos */}
                <div className="divide-y divide-nuvia-peach/20">
                  {filteredFavorites.map((favorite) => (
                    <div
                      key={`${favorite.type}-${favorite.id}`}
                      className="p-4 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Archivo */}
                        <div className="col-span-12 sm:col-span-6 lg:col-span-5">
                          <div className="flex items-center gap-3">
                            {/* Miniatura - SIEMPRE visible */}
                            <div 
                              className="w-16 h-16 rounded-lg overflow-hidden border border-nuvia-silver/30 shadow-sm flex-shrink-0 bg-gradient-to-br from-nuvia-deep/5 to-nuvia-peach/5 cursor-pointer group relative"
                              onClick={() => handleFileClick(favorite)}
                            >
                              {/* Para imágenes: mostrar directamente */}
                              {favorite.type === "image" ? (
                                <img 
                                  src={getThumbnailUrl(favorite)} 
                                  alt={favorite.originalFilename}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23f3f4f6' width='64' height='64'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='10'%3EImage%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                              ) : (
                                getThumbnailUrl(favorite) ? (
                                  <img
                                    src={getThumbnailUrl(favorite)!}
                                    alt={favorite.originalFilename}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-nuvia-mauve/10 to-nuvia-rose/10 flex items-center justify-center">
                                    <Video className="w-6 h-6 text-nuvia-mauve" />
                                  </div>
                                )
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p 
                                className="font-medium text-nuvia-deep truncate hover:text-nuvia-rose cursor-pointer transition-colors"
                                onClick={() => handleFileClick(favorite)}
                              >
                                {favorite.originalFilename}
                              </p>
                              <div className="sm:hidden flex flex-wrap gap-2 mt-1">
                                <span className="text-xs text-nuvia-mauve/70">{formatFileSize(favorite.fileSize)}</span>
                                <span className="text-xs text-nuvia-mauve/70">•</span>
                                <span className="text-xs text-nuvia-mauve/70 capitalize">{favorite.type}</span>
                                <span className="text-xs text-nuvia-mauve/70">•</span>
                                <span className="text-xs text-nuvia-mauve/70">{formatDate(favorite.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tamaño - Solo desktop */}
                        <div className="hidden sm:block col-span-2 text-nuvia-mauve">
                          {formatFileSize(favorite.fileSize)}
                        </div>

                        {/* Fecha - Solo desktop */}
                        <div className="hidden md:block col-span-2 text-nuvia-mauve">
                          {formatDate(favorite.createdAt)}
                        </div>

                        {/* Tipo - Solo desktop */}
                        <div className="hidden lg:block col-span-2 text-nuvia-mauve capitalize">
                          {favorite.type}
                        </div>

                        {/* Acciones */}
                        <div className="col-span-12 sm:col-span-1 flex justify-end sm:justify-start">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-nuvia-peach/20 text-nuvia-mauve">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl">
                              <DropdownMenuItem onClick={() => handleFileClick(favorite)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver {favorite.type === 'image' ? 'imagen' : 'video'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(favorite)}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => removeFromFavorites(favorite)}
                                disabled={loadingRemove === favorite.id}
                              >
                                {loadingRemove === favorite.id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Quitando...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Quitar de favoritos
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty States */}
          {filteredFavorites.length === 0 && favorites.length === 0 && (
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
              <CardContent className="py-16 text-center">
                <Heart className="w-16 h-16 mx-auto text-nuvia-mauve/60 mb-4" />
                <p className="text-nuvia-deep text-lg font-semibold mb-2">No tienes archivos en favoritos</p>
                <p className="text-nuvia-mauve/70">
                  Marca algunos archivos como favoritos para verlos aquí
                </p>
              </CardContent>
            </Card>
          )}

          {filteredFavorites.length === 0 && favorites.length > 0 && (
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
              <CardContent className="py-16 text-center">
                <Search className="w-16 h-16 mx-auto text-nuvia-mauve/60 mb-4" />
                <p className="text-nuvia-deep text-lg font-semibold mb-2">No se encontraron favoritos</p>
                <p className="text-nuvia-mauve/70">
                  Intenta con otros términos de búsqueda o filtros
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal unificado para vista previa */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className={`${isFullscreen ? 'max-w-full w-full h-full' : 'max-w-7xl w-[95vw]'} max-h-[90vh] p-0 border-0 bg-gradient-to-br from-nuvia-mauve/20 via-nuvia-rose/15 to-nuvia-peach/20 overflow-hidden ${isFullscreen ? 'h-full' : ''}`}>
          {selectedFile && (
            <div className={`flex flex-col h-full ${isFullscreen ? 'bg-black' : ''}`}>
              {/* Header */}
              <div className={`p-4 border-b ${isFullscreen ? 'border-white/20 bg-black/80' : 'border-nuvia-silver/30 bg-white/95'} backdrop-blur-sm flex items-center justify-between ${isFullscreen ? 'text-white' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {selectedFile.type === 'image' ? (
                    <Image className={`w-5 h-5 ${isFullscreen ? 'text-white' : 'text-nuvia-mauve'} flex-shrink-0`} />
                  ) : (
                    <Video className={`w-5 h-5 ${isFullscreen ? 'text-white' : 'text-nuvia-mauve'} flex-shrink-0`} />
                  )}
                  <h3 className={`text-lg font-semibold truncate ${isFullscreen ? 'text-white' : 'text-nuvia-deep'}`}>
                    {selectedFile.originalFilename}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFile.type === 'video' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleFullscreen}
                      className={`h-8 w-8 ${isFullscreen ? 'hover:bg-white/20 text-white' : 'hover:bg-nuvia-peach/20'}`}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPreviewOpen(false)}
                    className={`h-8 w-8 ${isFullscreen ? 'hover:bg-white/20 text-white' : 'hover:bg-nuvia-peach/20'}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Contenido principal */}
              <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${isFullscreen ? 'bg-black' : ''}`}>
                {/* Vista previa - TOMA TODO EL ESPACIO DISPONIBLE */}
                <div className={`flex-1 flex items-center justify-center p-4 ${isFullscreen ? 'bg-black' : 'bg-gradient-to-br from-white/50 to-nuvia-silver/20'}`}>
                  {selectedFile.type === "image" ? (
                    <div className={`w-full h-full flex items-center justify-center ${isFullscreen ? 'bg-black' : ''}`}>
                      <img
                        src={getFileUrl(selectedFile)}
                        alt={selectedFile.originalFilename}
                        className={`${isFullscreen ? 'max-h-[85vh]' : 'max-h-[65vh]'} w-auto max-w-full object-contain rounded-lg ${isFullscreen ? '' : 'shadow-xl'}`}
                        style={{ maxHeight: isFullscreen ? '85vh' : '65vh' }}
                      />
                    </div>
                  ) : (
                    <video
                      src={getFileUrl(selectedFile)}
                      controls
                      preload="metadata"
                      poster={getThumbnailUrl(selectedFile) || undefined}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Panel de información - SOLO en modo normal (no fullscreen) */}
                {!isFullscreen && (
                  <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-nuvia-silver/30 bg-white/95 backdrop-blur-sm overflow-y-auto">
                    <div className="p-4 space-y-4">
                      {/* Información básica */}
                      <div>
                        <h4 className="font-semibold text-nuvia-deep mb-3">Información del archivo</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-nuvia-mauve/70 flex items-center gap-1">
                              {selectedFile.type === 'image' ? (
                                <Image className="w-3 h-3" />
                              ) : (
                                <Video className="w-3 h-3" />
                              )}
                              Tipo
                            </span>
                            <span className="text-nuvia-deep font-medium capitalize">{selectedFile.type}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-nuvia-mauve/70 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Tamaño
                            </span>
                            <span className="text-nuvia-deep font-medium">{formatFileSize(selectedFile.fileSize)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-nuvia-mauve/70 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Agregado
                            </span>
                            <span className="text-nuvia-deep font-medium">{formatDate(selectedFile.createdAt)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-nuvia-mauve/70">Formato</span>
                            <span className="text-nuvia-deep font-medium">{selectedFile.mimeType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Estado */}
                      <div>
                        <h4 className="font-semibold text-nuvia-deep mb-3">Estado</h4>
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${selectedFile.isFavorite ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                            <Heart className={`w-3 h-3 inline mr-1.5 ${selectedFile.isFavorite ? 'fill-current' : ''}`} />
                            {selectedFile.isFavorite ? 'En favoritos' : 'No en favoritos'}
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div>
                        <h4 className="font-semibold text-nuvia-deep mb-3">Acciones</h4>
                        <div className="space-y-2">
                          <Button
                            onClick={() => handleDownload(selectedFile)}
                            className="w-full justify-start gap-2 bg-gradient-to-r from-nuvia-mauve to-nuvia-rose text-white hover:shadow-nuvia-glow"
                          >
                            <Download className="w-4 h-4" />
                            Descargar archivo
                          </Button>
                          
                          <Button
                            onClick={() => {
                              setIsPreviewOpen(false);
                              removeFromFavorites(selectedFile);
                            }}
                            variant="outline"
                            className="w-full justify-start gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={loadingRemove === selectedFile.id}
                          >
                            {loadingRemove === selectedFile.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                Quitando...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Quitar de favoritos
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Favorites;