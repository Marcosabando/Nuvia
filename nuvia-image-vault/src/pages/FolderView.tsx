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
  AlertCircle,
  Settings,
  Edit3,
  File,
  FileImage,
  FileCode,
  Archive,
  FileType,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { apiService } from "@/services/api.services";
import { API_CONFIG } from "@/config/api.config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface FolderItem {
  id: number;
  type: "image" | "video" | "document";
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
  category?: string;
  pageCount?: number;
}

const FolderView = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [folderItems, setFolderItems] = useState<FolderItem[]>([]);
  const [folderInfo, setFolderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false);
  const [deleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FolderItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (success: boolean, message: string) => {
    toast({
      title: success ? "✅ Éxito" : "❌ Error",
      description: message,
      ...(success
        ? { className: "bg-green-50 border-green-200 text-green-800" }
        : { variant: "destructive" }),
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) {
      return "0 Bytes";
    }

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

    return `${value} ${sizes[i]}`;
  };

  // ✅ Función para obtener el icono según el tipo de documento
  const getDocumentIcon = (category?: string, mimeType?: string) => {
    if (mimeType?.includes("pdf")) return FileText;
    if (mimeType?.includes("word") || mimeType?.includes("document")) return FileType;
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) return File;
    if (mimeType?.includes("presentation") || mimeType?.includes("powerpoint")) return FileImage;
    if (mimeType?.includes("zip") || mimeType?.includes("rar") || mimeType?.includes("archive")) return Archive;
    if (mimeType?.includes("text") || mimeType?.includes("markdown")) return FileText;
    if (mimeType?.includes("json") || mimeType?.includes("xml") || mimeType?.includes("code")) return FileCode;

    switch (category) {
      case "office":
      case "text":
        return FileText;
      case "design":
        return FileImage;
      case "code":
        return FileCode;
      case "archive":
        return Archive;
      default:
        return File;
    }
  };

  // ✅ Función para obtener el color según categoría
  const getCategoryColor = (category?: string) => {
    const colors = {
      office: "#3B82F6",
      text: "#10B981",
      design: "#8B5CF6",
      code: "#F59E0B",
      archive: "#6B7280",
      other: "#9CA3AF",
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

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
          const { folder, images, videos, documents } = response.data;

          setFolderInfo(folder);

          const allItems: FolderItem[] = [];

          // ✅ Procesar imágenes
          if (images && Array.isArray(images)) {
            const imageItems = images.map((img: any): FolderItem => ({
              id: img.imageId,
              type: "image",
              itemId: img.imageId,
              userId: img.userId,
              title: img.title || img.originalFilename,
              originalFilename: img.originalFilename,
              filename: img.filename,
              filePath: img.imagePath,
              thumbnailPath: img.thumbnailPath,
              fileSize: Number(img.fileSize) || 0,
              mimeType: img.mimeType,
              createdAt: img.createdAt,
              isFavorite: img.isFavorite,
            }));
            allItems.push(...imageItems);
          }

          // ✅ Procesar vídeos
          if (videos && Array.isArray(videos)) {
            const videoItems = videos.map((vid: any): FolderItem => ({
              id: vid.videoId,
              type: "video",
              itemId: vid.videoId,
              userId: vid.userId,
              title: vid.title || vid.originalFilename,
              originalFilename: vid.originalFilename,
              filename: vid.filename,
              filePath: vid.videoPath,
              thumbnailPath: vid.thumbnailPath,
              fileSize: Number(vid.fileSize) || 0,
              mimeType: vid.mimeType,
              createdAt: vid.createdAt,
              isFavorite: vid.isFavorite,
            }));
            allItems.push(...videoItems);
          }

          // ✅ Procesar documentos (NUEVO)
          if (documents && Array.isArray(documents)) {
            const documentItems = documents.map((doc: any): FolderItem => ({
              id: doc.documentId,
              type: "document",
              itemId: doc.documentId,
              userId: doc.userId,
              title: doc.title || doc.originalFilename,
              originalFilename: doc.originalFilename,
              filename: doc.filename,
              filePath: doc.documentPath,
              thumbnailPath: doc.thumbnailPath,
              fileSize: Number(doc.fileSize) || 0,
              mimeType: doc.mimeType,
              createdAt: doc.createdAt,
              isFavorite: doc.isFavorite,
              category: doc.category,
              pageCount: doc.pageCount,
            }));
            allItems.push(...documentItems);
          }

          allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setFolderItems(allItems);
        } else {
          throw new Error(response.error || "Error al cargar el contenido de la carpeta");
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

  const openDeleteItemModal = (item: FolderItem) => {
    setItemToDelete(item);
    setDeleteItemModalOpen(true);
  };

  const removeFromFolder = async () => {
    if (!itemToDelete || !folderId) return;

    const numericFolderId = Number(folderId);

    // Actualización optimista
    setFolderItems((prev) =>
      prev.filter((x) => !(x.type === itemToDelete.type && x.itemId === itemToDelete.itemId))
    );

    window.dispatchEvent(
      new CustomEvent("folders:itemDelta", {
        detail: { folderId: numericFolderId, delta: -1 },
      })
    );

    try {
      setIsDeleting(true);

      // ✅ Determinar el endpoint según el tipo
      let endpoint = "";
      if (itemToDelete.type === "image") {
        endpoint = `/folders/${folderId}/images/${itemToDelete.itemId}`;
      } else if (itemToDelete.type === "video") {
        endpoint = `/folders/${folderId}/videos/${itemToDelete.itemId}`;
      } else if (itemToDelete.type === "document") {
        endpoint = `/folders/${folderId}/documents/${itemToDelete.itemId}`;
      }

      const response = await apiService.delete(endpoint);

      if (response.success) {
        setDeleteItemModalOpen(false);
        setItemToDelete(null);
        showToast(true, "Archivo quitado de la carpeta");
        return;
      }

      throw new Error(response.error || "Error al quitar el archivo");
    } catch (error: any) {
      console.error("Error removiendo archivo:", error);

      // Revertir cambio optimista
      setFolderItems((prev) => (itemToDelete ? [itemToDelete, ...prev] : prev));

      window.dispatchEvent(
        new CustomEvent("folders:itemDelta", {
          detail: { folderId: numericFolderId, delta: 1 },
        })
      );

      showToast(false, error?.response?.data?.error || "Error al quitar el archivo de la carpeta");
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteFolder = async () => {
    if (!folderId) return;

    try {
      setIsDeleting(true);

      const response = await apiService.delete(`/folders/${folderId}`);

      if (response.success) {
        showToast(true, "Carpeta eliminada correctamente");
        navigate("/home");
        return;
      }

      throw new Error(response.error || "Error al eliminar la carpeta");
    } catch (error: any) {
      console.error("Error eliminando carpeta:", error);
      showToast(false, error?.response?.data?.error || "Error al eliminar la carpeta");
    } finally {
      setIsDeleting(false);
      setDeleteFolderModalOpen(false);
    }
  };

  const getFileUrl = (item: FolderItem): string => {
    let cleanPath = item.filePath;
    if (item.filePath.startsWith("uploads/")) {
      cleanPath = item.filePath.replace("uploads/", "");
    }
    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
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

  const filteredItems = folderItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(searchLower) ||
      item.originalFilename.toLowerCase().includes(searchLower);

    const matchesFilter = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: folderItems.length,
    images: folderItems.filter((item) => item.type === "image").length,
    videos: folderItems.filter((item) => item.type === "video").length,
    documents: folderItems.filter((item) => item.type === "document").length,
    totalSize: folderItems.reduce((acc, item) => acc + item.fileSize, 0),
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "text-nuvia-mauve";
      case "image":
        return "text-nuvia-peach";
      case "document":
        return "text-nuvia-deep";
      default:
        return "text-muted-foreground";
    }
  };

  const getTypeIcon = (item: FolderItem) => {
    if (item.type === "video") return VideoIcon;
    if (item.type === "image") return ImageIcon;
    if (item.type === "document") return getDocumentIcon(item.category, item.mimeType);
    return FileText;
  };

  // ✅ NUEVO: estilo con CONTRASTE usando SOLO colores existentes del CSS
  // Base: nuvia-deep (más contrastado)
  // Hover: nuvia-peach (naranjita)
  const nuviaContrastBtn =
    "gap-2 !bg-nuvia-deep !text-white border border-white/10 shadow-nuvia-soft hover:!bg-nuvia-peach hover:!text-nuvia-deep hover:border-nuvia-peach/40 transition-all";

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

              {/* ✅ BOTÓN VOLVER (ERROR STATE) */}
              <Button onClick={() => navigate("/home")} variant="outline" className={nuviaContrastBtn}>
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
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">{folderInfo.name}</h1>
              {folderInfo.description && <p className="text-sm text-white mt-1">{folderInfo.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-white/80">
                  {stats.total} {stats.total === 1 ? "elemento" : "elementos"}
                </span>
                {folderInfo.isSystem && (
                  <span className="text-xs bg-nuvia-peach/20 text-nuvia-peach px-2 py-1 rounded-full">Sistema</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* ✅ VOLVER (AHORA CONTRASTE: deep + hover peach) */}
            <Button onClick={() => navigate("/home")} variant="outline" className={nuviaContrastBtn}>
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* ✅ ENGRANAJE (AHORA CONTRASTE: deep + hover peach) */}
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-10 w-10 !bg-nuvia-deep !text-white border border-white/10 shadow-nuvia-soft hover:!bg-nuvia-peach hover:!text-nuvia-deep hover:border-nuvia-peach/40 transition-all`}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                <DropdownMenuItem>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar carpeta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteFolderModalOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar carpeta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
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
                <p className="text-sm text-nuvia-mauve">Documentos</p>
                <FileText className="w-5 h-5 text-nuvia-silver" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">{stats.documents}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
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
              {/* ✅ FILTRAR (AHORA CONTRASTE: deep + hover peach) */}
              <Button variant="outline" className={nuviaContrastBtn}>
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

        {/* List */}
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
                    const Icon = getTypeIcon(item);

                    return (
                      <tr
                        key={`${item.type}-${item.id}`}
                        className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-nuvia-silver/30 shadow-sm flex-shrink-0">
                              {item.type === "image" ? (
                                <img
                                  src={getFileUrl(item)}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.innerHTML =
                                      '<div class="w-full h-full bg-gradient-to-br from-nuvia-peach/10 to-nuvia-rose/10 flex items-center justify-center"><span class="text-2xl">🖼️</span></div>';
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
                                    e.currentTarget.parentElement!.innerHTML =
                                      '<div class="w-full h-full bg-gradient-to-br from-nuvia-mauve/10 to-nuvia-rose/10 flex items-center justify-center"><span class="text-2xl">🎬</span></div>';
                                  }}
                                />
                              ) : (
                                <div 
                                  className="w-full h-full flex items-center justify-center"
                                  style={{ backgroundColor: `${getCategoryColor(item.category)}15` }}
                                >
                                  <Icon className={`w-6 h-6`} style={{ color: getCategoryColor(item.category) }} />
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="font-medium text-nuvia-deep">{item.title}</p>
                              <p className="text-xs text-nuvia-mauve sm:hidden">
                                {formatFileSize(item.fileSize)} • {item.type}
                              </p>
                              {item.title !== item.originalFilename && (
                                <p className="text-xs text-nuvia-silver mt-1">Original: {item.originalFilename}</p>
                              )}
                              {item.pageCount && (
                                <p className="text-xs text-nuvia-silver mt-1">{item.pageCount} páginas</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-nuvia-mauve hidden sm:table-cell">{formatFileSize(item.fileSize)}</td>
                        <td className="p-4 text-nuvia-mauve hidden md:table-cell">{formatDate(item.createdAt)}</td>
                        <td className="p-4 text-nuvia-mauve hidden lg:table-cell capitalize">{item.type}</td>

                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium"
                            >
                              <DropdownMenuItem onClick={() => window.open(getFileUrl(item), "_blank")}>
                                <Eye className="w-4 h-4 mr-2" />
                                Abrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getFileUrl(item), "_blank")}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openDeleteItemModal(item)}
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
              <p className="text-sm text-nuvia-mauve/70 mt-2">Agrega algunos archivos para verlos aquí</p>
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

      {/* Modal eliminar carpeta */}
      <Dialog open={deleteFolderModalOpen} onOpenChange={setDeleteFolderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Eliminar carpeta
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar la carpeta <strong>"{folderInfo?.name}"</strong>?
              <br />
              <br />
              <span className="text-destructive font-medium">
                Esta acción no se puede deshacer. Se eliminarán {stats.total} archivos de esta carpeta.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteFolderModalOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteFolder} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar carpeta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal quitar item */}
      <Dialog open={deleteItemModalOpen} onOpenChange={setDeleteItemModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Quitar de la carpeta
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres quitar <strong>"{itemToDelete?.title}"</strong> de esta carpeta?
              <br />
              <br />
              <span className="text-destructive font-medium">
                El archivo no se eliminará, solo se quitará de esta carpeta.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteItemModalOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={removeFromFolder} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Quitando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Quitar archivo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default FolderView;
