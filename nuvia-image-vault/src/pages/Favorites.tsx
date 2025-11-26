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
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiService } from "@/services/api.services";
import { API_CONFIG } from "@/config/api.config";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const removeFromFavorites = async (item: FavoriteItem) => {
    try {
      console.log("🗑️ Quitando de favoritos:", item);
      
      const endpoint = item.type === 'image' 
        ? `/images/${item.id}/favorite`
        : `/videos/${item.id}/favorite`;
      
      const response = await apiService.post(endpoint);
      
      if (response.success) {
        console.log("✅ Favorito removido:", response.data);
        
        setFavorites(prev => prev.filter(fav => 
          !(fav.type === item.type && fav.id === item.id)
        ));
        
        // Cerrar modal si el archivo seleccionado fue removido
        if (selectedFile && selectedFile.id === item.id && selectedFile.type === item.type) {
          setIsModalOpen(false);
          setSelectedFile(null);
        }
      }
    } catch (error) {
      console.error("❌ Error removiendo favorito:", error);
    }
  };

  const clearAllFavorites = async () => {
    try {
      if (!confirm("¿Estás seguro de que quieres quitar todos los archivos de favoritos?")) {
        return;
      }

      console.log("🧹 Limpiando todos los favoritos...");
      
      const promises = favorites.map(fav => {
        const endpoint = fav.type === 'image' 
          ? `/images/${fav.id}/favorite`
          : `/videos/${fav.id}/favorite`;
        return apiService.post(endpoint);
      });
      
      await Promise.all(promises);
      
      setFavorites([]);
      setIsModalOpen(false);
      setSelectedFile(null);
      
      console.log("✅ Todos los favoritos removidos");
    } catch (error) {
      console.error("❌ Error limpiando favoritos:", error);
    }
  };

  const getFileUrl = (item: FavoriteItem): string => {
    const path = item.type === 'image' 
      ? (item as FavoriteImage).imagePath 
      : (item as FavoriteVideo).videoPath;
    
    let cleanPath = path;
    if (path.startsWith("uploads/")) {
      cleanPath = path.replace("uploads/", "");
    }
    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
  };

  const handleFileClick = (file: FavoriteItem) => {
    setSelectedFile(file);
    setIsModalOpen(true);
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
              >
                <Heart className="w-4 h-4" />
                Limpiar Favoritos
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
                            {/* Miniatura del mismo tamaño que en Recent (16x16) */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-nuvia-silver/30 shadow-sm flex-shrink-0 bg-gradient-to-br from-nuvia-deep/5 to-nuvia-peach/5">
                              {favorite.type === "image" ? (
                                <img 
                                  src={getFileUrl(favorite)} 
                                  alt={favorite.originalFilename}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-nuvia-mauve/10 to-nuvia-rose/10 flex items-center justify-center">
                                  <Video className="w-6 h-6 text-nuvia-mauve" />
                                </div>
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
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(favorite)}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => removeFromFavorites(favorite)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Quitar de favoritos
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

      {/* Modal para ver detalles del archivo - FONDO MORADO CON CONTENIDO BLANCO */}
      {isModalOpen && selectedFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-nuvia-mauve to-nuvia-rose rounded-2xl shadow-nuvia-strong max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/20">
            {/* Header del modal - Fondo morado con texto blanco */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <h3 className="text-lg font-semibold text-white truncate">
                {selectedFile.originalFilename}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedFile(null);
                }}
                className="h-8 w-8 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Contenido del modal - Fondo blanco con texto negro */}
            <div className="bg-white p-6">
              <div className="flex flex-col items-center space-y-6">
                {/* Vista previa */}
                <div className="w-full max-w-md aspect-square rounded-lg overflow-hidden border border-nuvia-silver/30 bg-gradient-to-br from-nuvia-deep/5 to-nuvia-peach/5">
                  {selectedFile.type === "image" ? (
                    <img
                      src={getFileUrl(selectedFile)}
                      alt={selectedFile.originalFilename}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-nuvia-mauve/10 to-nuvia-rose/10 flex items-center justify-center">
                      <Video className="w-16 h-16 text-nuvia-mauve" />
                    </div>
                  )}
                </div>

                {/* Información del archivo - Fondo blanco con texto negro */}
                <div className="w-full space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-nuvia-mauve font-medium">Tamaño</p>
                      <p className="text-nuvia-deep">{formatFileSize(selectedFile.fileSize)}</p>
                    </div>
                    <div>
                      <p className="text-nuvia-mauve font-medium">Tipo</p>
                      <p className="text-nuvia-deep capitalize">{selectedFile.type}</p>
                    </div>
                    <div>
                      <p className="text-nuvia-mauve font-medium">Agregado</p>
                      <p className="text-nuvia-deep">{formatDate(selectedFile.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-nuvia-mauve font-medium">Formato</p>
                      <p className="text-nuvia-deep">{selectedFile.mimeType}</p>
                    </div>
                  </div>
                </div>

                {/* Acciones del modal */}
                <div className="flex gap-3 w-full justify-center">
                  <Button
                    onClick={() => handleDownload(selectedFile)}
                    className="gap-2 bg-gradient-to-r from-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow"
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </Button>
                  <Button
                    onClick={() => removeFromFavorites(selectedFile)}
                    variant="outline"
                    className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Quitar de favoritos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Favorites;