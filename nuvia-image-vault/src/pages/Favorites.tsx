import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart,
  Star,
  Download,
  Search,
  Filter,
  MoreVertical,
  Image,
  Video,
  FileText,
  Trash2,
  Eye,
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

interface FavoriteItem {
  id: number;
  imageId: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  isFavorite: boolean;
}

const Favorites = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Obtener favoritos reales de la base de datos
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("🔄 Obteniendo favoritos...");
        
        // ✅ Obtener solo las imágenes marcadas como favoritas
        const response = await apiService.get('/images?favorites=true');
        
        console.log("📸 Respuesta de favoritos:", response);

        if (response.success && response.data) {
          setFavorites(response.data);
          console.log("✅ Favoritos cargados:", response.data.length);
        } else {
          throw new Error(response.error || 'Error al cargar favoritos');
        }
      } catch (err: any) {
        console.error("❌ Error cargando favoritos:", err);
        setError(err.message || "No se pudieron cargar los favoritos");
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  // ✅ Función para quitar de favoritos
  const removeFromFavorites = async (imageId: number) => {
    try {
      console.log("🗑️ Quitando de favoritos:", imageId);
      
      const response = await apiService.post(`/images/${imageId}/favorite`);
      
      if (response.success) {
        console.log("✅ Favorito removido:", response.data);
        
        // ✅ Actualizar lista local inmediatamente
        setFavorites(prev => prev.filter(fav => fav.imageId !== imageId));
      }
    } catch (error) {
      console.error("❌ Error removiendo favorito:", error);
    }
  };

  // ✅ Función para limpiar todos los favoritos
  const clearAllFavorites = async () => {
    try {
      if (!confirm("¿Estás seguro de que quieres quitar todos los archivos de favoritos?")) {
        return;
      }

      console.log("🧹 Limpiando todos los favoritos...");
      
      // Quitar cada favorito individualmente
      const promises = favorites.map(fav => 
        apiService.post(`/images/${fav.imageId}/favorite`)
      );
      
      await Promise.all(promises);
      
      // ✅ Limpiar lista local
      setFavorites([]);
      
      console.log("✅ Todos los favoritos removidos");
    } catch (error) {
      console.error("❌ Error limpiando favoritos:", error);
    }
  };

  // ✅ Helper para obtener URL de imagen
  const getImageUrl = (imagePath: string): string => {
    let cleanPath = imagePath;
    if (imagePath.startsWith("uploads/")) {
      cleanPath = imagePath.replace("uploads/", "");
    }
    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
  };

  // ✅ Helper para determinar tipo de archivo
  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  };

  // ✅ Helper para formatear tamaño
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // ✅ Helper para formatear fecha
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

  // ✅ Filtrar favoritos
  const filteredFavorites = favorites.filter((favorite) => {
    const matchesSearch = favorite.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
    const fileType = getFileType(favorite.mimeType);
    const matchesFilter = filterType === "all" || fileType === filterType;
    return matchesSearch && matchesFilter;
  });

  // ✅ Estadísticas reales
  const stats = {
    total: favorites.length,
    images: favorites.filter(fav => getFileType(fav.mimeType) === 'image').length,
    videos: favorites.filter(fav => getFileType(fav.mimeType) === 'video').length,
    documents: favorites.filter(fav => getFileType(fav.mimeType) === 'document').length,
  };

  const getTypeColor = (mimeType: string) => {
    const type = getFileType(mimeType);
    switch (type) {
      case "document":
        return "text-nuvia-rose";
      case "video":
        return "text-nuvia-mauve";
      case "image":
        return "text-nuvia-peach";
      default:
        return "text-muted-foreground";
    }
  };

  const getTypeIcon = (mimeType: string) => {
    const type = getFileType(mimeType);
    switch (type) {
      case "document":
        return FileText;
      case "video":
        return Video;
      case "image":
        return Image;
      default:
        return FileText;
    }
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
              <Button onClick={() => window.location.reload()} variant="outline">
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
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Favoritos
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Tus archivos más importantes y destacados
            </p>
          </div>
          {favorites.length > 0 && (
            <Button 
              onClick={clearAllFavorites}
              className="gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all"
            >
              <Heart className="w-5 h-5" />
              Limpiar Favoritos
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
                <p className="text-sm text-nuvia-mauve">Documentos</p>
                <FileText className="w-5 h-5 text-nuvia-silver" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.documents}</p>
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
              <DropdownMenuItem onClick={() => setFilterType("document")}>Documentos</DropdownMenuItem>
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
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden lg:table-cell">Tipo</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFavorites.map((favorite) => {
                    const Icon = getTypeIcon(favorite.mimeType);
                    const fileType = getFileType(favorite.mimeType);
                    
                    return (
                      <tr
                        key={favorite.imageId}
                        className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center">
                              <Icon className={`w-5 h-5 ${getTypeColor(favorite.mimeType)}`} />
                            </div>
                            <div>
                              <p className="font-medium text-nuvia-deep">{favorite.originalFilename}</p>
                              <p className="text-xs text-nuvia-mauve sm:hidden">
                                {formatFileSize(favorite.fileSize)} • {fileType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-nuvia-mauve hidden sm:table-cell">
                          {formatFileSize(favorite.fileSize)}
                        </td>
                        <td className="p-4 text-nuvia-mauve hidden md:table-cell">
                          {formatDate(favorite.createdAt)}
                        </td>
                        <td className="p-4 text-nuvia-mauve hidden lg:table-cell capitalize">
                          {fileType}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                              <DropdownMenuItem onClick={() => window.open(getImageUrl(favorite.imagePath), "_blank")}>
                                <Eye className="w-4 h-4 mr-2" />
                                Abrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getImageUrl(favorite.imagePath), "_blank")}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => removeFromFavorites(favorite.imageId)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Quitar de favoritos
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredFavorites.length === 0 && favorites.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Heart className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">No tienes archivos en favoritos</p>
              <p className="text-sm text-nuvia-mauve/70 mt-2">
                Marca algunos archivos como favoritos para verlos aquí
              </p>
            </CardContent>
          </Card>
        )}

        {filteredFavorites.length === 0 && favorites.length > 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">No se encontraron favoritos con los filtros aplicados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;