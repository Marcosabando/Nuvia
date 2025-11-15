import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Folder,
  Download,
  Search,
  Filter,
  MoreVertical,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Trash2,
  Eye,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiService } from "@/services/api.services";
import { API_CONFIG } from "@/config/api.config";

interface FolderItem {
  id: number;
  type: 'image' | 'video';
  itemId: number;
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  isFavorite: boolean;
}

const FolderView = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [folderItems, setFolderItems] = useState<FolderItem[]>([]);
  const [folderInfo, setFolderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener contenido de la carpeta
  useEffect(() => {
    const fetchFolderContent = async () => {
      if (!folderId || folderId === "undefined") {
        setError("ID de carpeta no válido");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await apiService.get(`/folders/${folderId}/content`);

        if (response.success && response.data) {
          const { folder, images, videos } = response.data;
          
          setFolderInfo(folder);
          
          const allItems: FolderItem[] = [];

          // Agregar imágenes
          if (images && Array.isArray(images)) {
            const imageItems = images.map((img: any): FolderItem => ({
              id: img.imageId,
              type: 'image',
              itemId: img.imageId,
              userId: img.userId,
              title: img.title,
              originalFilename: img.originalFilename,
              filename: img.filename,
              filePath: img.imagePath,
              thumbnailPath: img.thumbnailPath,
              fileSize: img.fileSize,
              mimeType: img.mimeType,
              createdAt: img.createdAt,
              isFavorite: img.isFavorite,
            }));
            allItems.push(...imageItems);
          }

          // Agregar videos
          if (videos && Array.isArray(videos)) {
            const videoItems = videos.map((vid: any): FolderItem => ({
              id: vid.videoId,
              type: 'video',
              itemId: vid.videoId,
              userId: vid.userId,
              title: vid.title,
              originalFilename: vid.originalFilename,
              filename: vid.filename,
              filePath: vid.videoPath,
              thumbnailPath: vid.thumbnailPath,
              fileSize: vid.fileSize,
              mimeType: vid.mimeType,
              createdAt: vid.createdAt,
              isFavorite: vid.isFavorite,
            }));
            allItems.push(...videoItems);
          }

          // Ordenar por fecha (más recientes primero)
          allItems.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setFolderItems(allItems);
        } else {
          throw new Error(response.error || 'Error al cargar el contenido de la carpeta');
        }
      } catch (err: any) {
        console.error("Error cargando carpeta:", err);
        setError(err.message || "No se pudo cargar el contenido de la carpeta");
      } finally {
        setLoading(false);
      }
    };

    fetchFolderContent();
  }, [folderId]);

  // Función para quitar archivo de la carpeta
  const removeFromFolder = async (item: FolderItem) => {
    try {
      if (!folderId) return;
      
      const endpoint = item.type === 'image' 
        ? `/folders/${folderId}/images/${item.itemId}`
        : `/folders/${folderId}/videos/${item.itemId}`;
      
      const response = await apiService.delete(endpoint);
      
      if (response.success) {
        // Actualizar lista local inmediatamente
        setFolderItems(prev => prev.filter(fav => 
          !(fav.type === item.type && fav.id === item.id)
        ));
      }
    } catch (error) {
      console.error("Error removiendo archivo:", error);
      alert("Error al quitar el archivo de la carpeta");
    }
  };

  // Helper para obtener URL de archivo
  const getFileUrl = (item: FolderItem): string => {
    let cleanPath = item.filePath;
    if (item.filePath.startsWith("uploads/")) {
      cleanPath = item.filePath.replace("uploads/", "");
    }
    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
  };

  // Helper para formatear tamaño
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Helper para formatear fecha
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

  // Filtrar archivos
  const filteredItems = folderItems.filter((item) => {
    const matchesSearch = item.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Estadísticas
  const stats = {
    total: folderItems.length,
    images: folderItems.filter(item => item.type === 'image').length,
    videos: folderItems.filter(item => item.type === 'video').length,
    totalSize: folderItems.reduce((acc, item) => acc + item.fileSize, 0),
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "text-nuvia-mauve";
      case "image":
        return "text-nuvia-peach";
      default:
        return "text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return VideoIcon;
      case "image":
        return ImageIcon;
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
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-nuvia-mauve" />
              <p className="text-nuvia-mauve">Cargando carpeta...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !folderInfo) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-white">Error al cargar carpeta</h2>
              <p className="text-red-500 mb-4">{error || "Carpeta no encontrada"}</p>
              <Button onClick={() => navigate("/home")} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
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
          <div className="flex items-center gap-4 flex-1">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ backgroundColor: folderInfo.color }}
            >
              <Folder className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
                {folderInfo.name}
              </h1>
              {folderInfo.description && (
                <p className="text-sm text-white mt-1">
                  {folderInfo.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-white/80">
                  {stats.total} {stats.total === 1 ? 'elemento' : 'elementos'}
                </span>
                {folderInfo.isSystem && (
                  <span className="text-xs bg-nuvia-peach/20 text-nuvia-peach px-2 py-1 rounded-full">
                    Sistema
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Botón Volver a la derecha */}
          <Button 
            onClick={() => navigate("/home")}
            variant="outline" 
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Total Archivos</p>
                <Folder className="w-5 h-5 text-nuvia-rose" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-rose/10 border border-nuvia-rose/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Imágenes</p>
                <ImageIcon className="w-5 h-5 text-nuvia-peach" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.images}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-mauve/10 border border-nuvia-mauve/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Vídeos</p>
                <VideoIcon className="w-5 h-5 text-nuvia-mauve" />
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
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                {formatFileSize(stats.totalSize)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuvia-mauve" />
            <Input
              placeholder="Buscar en la carpeta..."
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

        {/* Files List */}
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
                  {filteredItems.map((item) => {
                    const Icon = getTypeIcon(item.type);
                    
                    return (
                      <tr
                        key={`${item.type}-${item.id}`}
                        className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Miniatura según tipo de archivo */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-nuvia-silver/30 shadow-sm flex-shrink-0">
                              {item.type === "image" ? (
                                <img 
                                  src={getFileUrl(item)} 
                                  alt={item.originalFilename}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-nuvia-peach/10 to-nuvia-rose/10 flex items-center justify-center"><span class="text-2xl">🖼️</span></div>';
                                  }}
                                />
                              ) : item.type === "video" ? (
                                <video
                                  src={getFileUrl(item)}
                                  className="w-full h-full object-cover"
                                  muted
                                  preload="metadata"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-nuvia-mauve/10 to-nuvia-rose/10 flex items-center justify-center"><span class="text-2xl">🎬</span></div>';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-nuvia-deep/10 to-nuvia-silver/10 flex items-center justify-center">
                                  <Icon className={`w-6 h-6 ${getTypeColor(item.type)}`} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-nuvia-deep">{item.originalFilename}</p>
                              <p className="text-xs text-nuvia-mauve sm:hidden">
                                {formatFileSize(item.fileSize)} • {item.type}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-nuvia-mauve hidden sm:table-cell">
                          {formatFileSize(item.fileSize)}
                        </td>
                        <td className="p-4 text-nuvia-mauve hidden md:table-cell">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="p-4 text-nuvia-mauve hidden lg:table-cell capitalize">
                          {item.type}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                              <DropdownMenuItem onClick={() => window.open(getFileUrl(item), "_blank")}>
                                <Eye className="w-4 h-4 mr-2" />
                                Abrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getFileUrl(item), "_blank")}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => removeFromFolder(item)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Quitar de carpeta
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

        {filteredItems.length === 0 && folderItems.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Folder className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">La carpeta está vacía</p>
              <p className="text-sm text-nuvia-mauve/70 mt-2">
                Agrega algunos archivos para verlos aquí
              </p>
            </CardContent>
          </Card>
        )}

        {filteredItems.length === 0 && folderItems.length > 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">No se encontraron archivos con los filtros aplicados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default FolderView;