// src/components/DocumentsGallery.tsx
import { useState, useEffect, useMemo } from "react";
import {
  MoreHorizontal,
  Download,
  Heart,
  Trash2,
  Edit3,
  RefreshCw,
  Calendar,
  Grid3X3,
  List,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  File,
  FileImage,
  FileCode,
  Archive,
  FileType,
  FolderPlus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { useDocuments } from "@/hooks/useDocuments";
import { useToast } from "@/hooks/use-toast";
import DocumentViewer from "./DocumentViewer";
import { API_CONFIG } from "@/config/api.config";
import { apiService } from "@/services/api.services";

interface DocumentData {
  id: number;
  documentId: number;
  userId: number;
  title: string;
  description?: string;
  category: string;
  tags?: string;
  originalFilename: string;
  filename: string;
  documentPath: string;
  thumbnailPath?: string;
  previewPath?: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  isFavorite: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: number;
  folderId?: number;
  name: string;
  color: string;
  isSystem: boolean;
  itemCount: number;
}

const getDocumentThumbnailUrl = (document: DocumentData | null): string | null => {
  if (!document) return null;

  if (document.thumbnailPath) {
    let cleanPath = document.thumbnailPath;
    if (cleanPath.startsWith("uploads/")) cleanPath = cleanPath.replace("uploads/", "");
    return `${API_CONFIG.UPLOADS_URL}/${cleanPath}`;
  }

  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  if (token && (document.mimeType?.includes("pdf") || document.mimeType?.includes("image"))) {
    return `${API_CONFIG.BASE_URL}/documents/${document.id}/preview?thumb=true&token=${encodeURIComponent(token)}`;
  }

  return null;
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const getDocumentIcon = (category: string, mimeType: string) => {
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

const getCategoryColor = (category: string) => {
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

const handleDownload = async (document: any, showToast: (success: boolean, message: string) => void) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/documents/${document.id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    });
    if (!response.ok) throw new Error("Error en la descarga");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = document.originalFilename;
    link.click();
    window.URL.revokeObjectURL(url);

    showToast(true, "Descarga iniciada");
  } catch (error) {
    console.error("Error descargando:", error);
    showToast(false, "Error al descargar el documento");
  }
};

export default function DocumentsGallery({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  const [currentViewMode, setCurrentViewMode] = useState<"grid" | "list">(viewMode);
  const [searchTerm, setSearchTerm] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [renameModal, setRenameModal] = useState<{ open: boolean; document: DocumentData | null; name: string }>({
    open: false,
    document: null,
    name: "",
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; document: any }>({
    open: false,
    document: null,
  });

  // ✅ Carpetas para "Añadir a carpeta"
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  const { toast } = useToast();
  const { documents, loading, error, refetch, toggleFavorite, deleteDocument, renameDocument } = useDocuments();

  const showToast = (success: boolean, message: string) => {
    toast({
      title: success ? "✅ Éxito" : "❌ Error",
      description: message,
      ...(success ? { className: "bg-green-50 border-green-200 text-green-800" } : { variant: "destructive" }),
    });
  };

  // ✅ Cargar carpetas 1 vez (y escuchar refresh si quieres)
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setFoldersLoading(true);
        const res = await apiService.get("/folders");
        if (res?.success && Array.isArray(res.data)) {
          setFolders(res.data.filter((f: Folder) => !f.isSystem));
        }
      } catch (e) {
        console.error("Error cargando carpetas:", e);
      } finally {
        setFoldersLoading(false);
      }
    };

    fetchFolders();

    // Si en algún momento emites folders:refresh, esto las recarga:
    const onRefresh = () => fetchFolders();
    window.addEventListener("folders:refresh", onRefresh);
    return () => window.removeEventListener("folders:refresh", onRefresh);
  }, []);

  const handleRename = async () => {
    if (!renameModal.name.trim() || !renameModal.document) {
      showToast(false, "El nombre no puede estar vacío");
      return;
    }
    try {
      await renameDocument(renameModal.document.id, renameModal.name.trim());
      showToast(true, "Documento renombrado");
      setRenameModal({ open: false, document: null, name: "" });
    } catch (error: any) {
      showToast(false, error.message || "Error al renombrar");
    }
  };

  const handleToggleFavorite = async (document: DocumentData) => {
    try {
      await toggleFavorite(document.id, !document.isFavorite);
      showToast(true, document.isFavorite ? "Quitado de favoritos" : "Añadido a favoritos");
    } catch (error: any) {
      showToast(false, error.message || "Error al actualizar favoritos");
    }
  };

  const handleDelete = async (document: any) => {
    setDeleteModal({
      open: true,
      document,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.document) return;

    try {
      await deleteDocument(deleteModal.document.id);
      if (selectedDocument?.id === deleteModal.document.id) {
        setSelectedDocument(null);
      }
      showToast(true, "Documento movido a la papelera");
      setDeleteModal({ open: false, document: null });
    } catch (error) {
      showToast(false, "Error al eliminar documento");
    }
  };

  // ✅ Añadir documento a carpeta (optimista sidebar)
  const addToFolder = async (documentId: number, folderId: number) => {
    if (!folderId || isNaN(folderId)) {
      showToast(false, "ID de carpeta inválido");
      return;
    }

    try {
      // ✅ Petición al backend (ajusta endpoint si tu API difiere)
      const res = await apiService.post(`/folders/${folderId}/documents`, { documentId });

      if (!res?.success) throw new Error(res?.error || "No se pudo añadir el documento a la carpeta");

      // ✅ Sidebar: +1 sin GET extra
      window.dispatchEvent(new CustomEvent("folders:itemDelta", { detail: { folderId, delta: 1 } }));

      // ✅ Refrescar el submenu local (solo números del menu si los muestras)
      setFolders((prev) =>
        prev.map((f) => ((f.folderId || f.id) === folderId ? { ...f, itemCount: (f.itemCount || 0) + 1 } : f))
      );

      showToast(true, "Documento añadido a la carpeta");

      // (Opcional) verificación sin spamear:
      // window.dispatchEvent(new Event("folders:refresh"));
    } catch (e: any) {
      console.error("Error añadiendo documento a carpeta:", e);
      showToast(false, e?.response?.data?.error || e?.message || "Error al añadir documento a carpeta");
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        document.title?.toLowerCase().includes(searchLower) ||
        document.originalFilename?.toLowerCase().includes(searchLower) ||
        document.description?.toLowerCase().includes(searchLower) ||
        document.tags?.toLowerCase().includes(searchLower);

      const matchesFavorites = !favoritesOnly || document.isFavorite;
      return matchesSearch && matchesFavorites;
    });
  }, [documents, searchTerm, favoritesOnly]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, favoritesOnly]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!loading && documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-nuvia-peach/20 rounded-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-nuvia-mauve" />
        </div>
        <h3 className="text-lg font-semibold text-nuvia-deep mb-2">No hay documentos</h3>
        <p className="text-nuvia-deep/60 mb-4">Comienza subiendo tu primer documento</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Recargar
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nuvia-deep/40 w-4 h-4" />
              <Input
                placeholder="Buscar documentos..."
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
                favoritesOnly ? "bg-nuvia-mauve hover:bg-nuvia-mauve/90 text-white" : "text-white"
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
              onClick={() => refetch()}
              disabled={loading}
              className="border-nuvia-silver/30 text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <div className="flex border border-nuvia-silver/30 rounded-lg overflow-hidden">
              <Button
                variant={currentViewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="w-9 h-9 rounded-none"
                onClick={() => setCurrentViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={currentViewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="w-9 h-9 rounded-none"
                onClick={() => setCurrentViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Skeleton */}
        {loading && filteredDocuments.length === 0 ? (
          <div className={currentViewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6" : "space-y-4"}>
            {Array.from({ length: 8 }).map((_, i) =>
              currentViewMode === "list" ? (
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
            )}
          </div>
        ) : (
          <>
            <div className={currentViewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6" : "space-y-4"}>
              {paginatedDocuments.map((document) => {
                const displayName = document.title || document.originalFilename;
                const DocumentIcon = getDocumentIcon(document.category, document.mimeType);
                const categoryColor = getCategoryColor(document.category);

                const docId = document.id ?? document.documentId;

                if (currentViewMode === "list") {
                  return (
                    <Card key={document.id} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div
                            className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg relative overflow-hidden cursor-pointer flex items-center justify-center"
                            onClick={() => setSelectedDocument(document)}
                            style={{ backgroundColor: `${categoryColor}15` }}
                          >
                            {getDocumentThumbnailUrl(document) ? (
                              <img
                                src={getDocumentThumbnailUrl(document)!}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <DocumentIcon className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: categoryColor }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="cursor-pointer" onClick={() => setSelectedDocument(document)}>
                              <h3 className="text-sm font-semibold text-nuvia-deep truncate mb-1">{displayName}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-nuvia-deep/60">
                                <span>{formatFileSize(document.fileSize)}</span>
                                {document.pageCount && <span>{document.pageCount} páginas</span>}
                              </div>
                              {document.description && (
                                <p className="text-xs text-nuvia-deep/60 mt-1 line-clamp-2">{document.description}</p>
                              )}
                            </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30"
                                  onClick={() => handleToggleFavorite(document)}
                                >
                                  <Heart className={`w-3 h-3 ${document.isFavorite ? "text-red-500 fill-current" : "text-gray-600"}`} />
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="sm" className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30">
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent align="end" className="w-56 z-[9999]">
                                    <DropdownMenuItem onClick={() => handleToggleFavorite(document)}>
                                      <Heart className={`w-4 h-4 mr-2 ${document.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                      {document.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                    </DropdownMenuItem>

                                    {/* ✅ Añadir a carpeta */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <FolderPlus className="w-4 h-4 mr-2" />
                                        Añadir a carpeta
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="w-56">
                                          {foldersLoading ? (
                                            <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                                          ) : folders.length === 0 ? (
                                            <DropdownMenuItem disabled>No tienes carpetas</DropdownMenuItem>
                                          ) : (
                                            folders.map((folder) => {
                                              const fid = folder.folderId || folder.id;
                                              if (!fid || isNaN(fid)) return null;
                                              return (
                                                <DropdownMenuItem key={fid} onClick={() => addToFolder(docId, fid)}>
                                                  <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: folder.color }} />
                                                  <span className="truncate flex-1">{folder.name}</span>
                                                  {folder.itemCount > 0 && <span className="text-xs text-gray-500 ml-2">({folder.itemCount})</span>}
                                                </DropdownMenuItem>
                                              );
                                            })
                                          )}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>

                                    <DropdownMenuItem onClick={() => handleDownload(document)}>
                                      <Download className="w-4 h-4 mr-2" />
                                      Descargar
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() =>
                                        setRenameModal({
                                          open: true,
                                          document,
                                          name: displayName,
                                        })
                                      }
                                    >
                                      <Edit3 className="w-4 h-4 mr-2" />
                                      Renombrar
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(document)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Mover a papelera
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // GRID
                return (
                  <Card key={document.id} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                    <CardContent className="p-0 relative">
                      <div
                        className="aspect-square relative overflow-hidden cursor-pointer flex items-center justify-center"
                        onClick={() => setSelectedDocument(document)}
                        style={{ backgroundColor: `${categoryColor}08` }}
                      >
                        {getDocumentThumbnailUrl(document) ? (
                          <img
                            src={getDocumentThumbnailUrl(document)!}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <DocumentIcon className="w-16 h-16 transition-transform duration-300 group-hover:scale-110" style={{ color: categoryColor }} />
                        )}

                        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(document);
                            }}
                          >
                            <Heart className={`w-3 h-3 ${document.isFavorite ? "text-red-500 fill-current" : "text-gray-600"}`} />
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

                            <DropdownMenuContent align="end" className="w-56 z-[9999]">
                              <DropdownMenuItem onClick={() => handleToggleFavorite(document)}>
                                <Heart className={`w-4 h-4 mr-2 ${document.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                {document.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                              </DropdownMenuItem>

                              {/* ✅ Añadir a carpeta */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderPlus className="w-4 h-4 mr-2" />
                                  Añadir a carpeta
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent className="w-56">
                                    {foldersLoading ? (
                                      <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                                    ) : folders.length === 0 ? (
                                      <DropdownMenuItem disabled>No tienes carpetas</DropdownMenuItem>
                                    ) : (
                                      folders.map((folder) => {
                                        const fid = folder.folderId || folder.id;
                                        if (!fid || isNaN(fid)) return null;
                                        return (
                                          <DropdownMenuItem key={fid} onClick={() => addToFolder(docId, fid)}>
                                            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: folder.color }} />
                                            <span className="truncate flex-1">{folder.name}</span>
                                            {folder.itemCount > 0 && <span className="text-xs text-gray-500 ml-2">({folder.itemCount})</span>}
                                          </DropdownMenuItem>
                                        );
                                      })
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>

                              <DropdownMenuItem onClick={() => handleDownload(document)}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setRenameModal({
                                    open: true,
                                    document,
                                    name: displayName,
                                  })
                                }
                              >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Renombrar
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem 
                                className="text-red-600" 
                                onSelect={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(document);
                                }}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Mover a papelera
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="p-3 bg-white border-t border-nuvia-silver/30">
                        <p className="text-sm font-medium truncate text-nuvia-deep mb-1">{displayName}</p>
                        <div className="flex justify-between items-center text-xs text-nuvia-deep/60">
                          <span>{formatFileSize(document.fileSize)}</span>
                          {document.isFavorite && <Heart className="w-3 h-3 text-red-500 fill-current" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-nuvia-silver/30 gap-4">
                <div className="text-sm text-nuvia-deep/60">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDocuments.length)} de{" "}
                  {filteredDocuments.length} documentos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-nuvia-silver/30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 ${
                            currentPage === pageNum ? "bg-nuvia-mauve text-white" : "border-nuvia-silver/30"
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
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

      {/* Viewer */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 border-0 bg-gradient-to-br from-nuvia-mauve/20 via-nuvia-rose/15 to-nuvia-peach/20 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista previa del documento</DialogTitle>
            <DialogDescription>
              Visualización del documento {selectedDocument?.title || selectedDocument?.originalFilename}
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="flex-1 min-h-[40vh] md:min-h-full bg-white/40">
                {selectedDocument.mimeType?.includes("pdf") ? (
                  <DocumentViewer documentId={selectedDocument.id} />
                ) : (
                  <div className="flex items-center justify-center h-full p-8 text-center">
                    <div>
                      <div
                        className="w-32 h-32 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${getCategoryColor(selectedDocument.category)}15` }}
                      >
                        {(() => {
                          const IconComponent = getDocumentIcon(selectedDocument.category, selectedDocument.mimeType);
                          return <IconComponent className="w-16 h-16" style={{ color: getCategoryColor(selectedDocument.category) }} />;
                        })()}
                      </div>
                      <p className="text-nuvia-deep/70">Vista previa no disponible para este tipo de archivo</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-nuvia-silver/30 bg-white/95 backdrop-blur-sm overflow-y-auto">
                <div className="p-4 border-b border-nuvia-silver/30 flex items-start justify-between sticky top-0 bg-white/95 z-10">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-semibold text-nuvia-deep break-words">
                      {selectedDocument.title || selectedDocument.originalFilename}
                    </h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDocument(null)} className="flex-shrink-0">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="bg-white/50 p-3 rounded-xl space-y-2 text-sm">
                    <h4 className="font-semibold text-nuvia-deep">Archivo</h4>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Tamaño</span>
                      <span>{formatFileSize(selectedDocument.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Tipo</span>
                      <span className="capitalize">{selectedDocument.mimeType}</span>
                    </div>
                  </div>

                  <div className="bg-white/50 p-3 rounded-xl space-y-2 text-sm">
                    <h4 className="font-semibold text-nuvia-deep flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Información
                    </h4>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Subida</span>
                      <span>{new Date(selectedDocument.createdAt).toLocaleDateString("es-ES")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nuvia-deep/60">Categoría</span>
                      <span className="capitalize">{selectedDocument.category}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-nuvia-deep">Acciones</h4>

                    {/* ✅ Añadir a carpeta desde el modal */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start border-nuvia-silver/30">
                          <FolderPlus className="w-4 h-4 mr-2" />
                          Añadir a carpeta
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 z-[9999]">
                        {foldersLoading ? (
                          <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                        ) : folders.length === 0 ? (
                          <DropdownMenuItem disabled>No tienes carpetas</DropdownMenuItem>
                        ) : (
                          folders.map((folder) => {
                            const fid = folder.folderId || folder.id;
                            if (!fid || isNaN(fid)) return null;
                            return (
                              <DropdownMenuItem
                                key={fid}
                                onClick={() => addToFolder(selectedDocument.id, fid)}
                              >
                                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: folder.color }} />
                                <span className="truncate flex-1">{folder.name}</span>
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start border-nuvia-silver/30"
                      onClick={() => handleDownload(selectedDocument)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start border-nuvia-silver/30"
                      onClick={() => {
                        setSelectedDocument(null);
                        setRenameModal({
                          open: true,
                          document: selectedDocument,
                          name: selectedDocument.title || selectedDocument.originalFilename,
                        });
                      }}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Renombrar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:bg-red-50 border-nuvia-silver/30"
                      onClick={() => handleDelete(selectedDocument)}
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

      {/* Rename */}
      <Dialog open={renameModal.open} onOpenChange={(open) => !open && setRenameModal({ open: false, document: null, name: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-nuvia-mauve" />
              Renombrar documento
            </DialogTitle>
          </DialogHeader>

          {renameModal.document && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-nuvia-silver/10 rounded-lg border border-nuvia-silver/30">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${getCategoryColor(renameModal.document.category)}15` }}
                >
                  {(() => {
                    const IconComponent = getDocumentIcon(renameModal.document.category, renameModal.document.mimeType);
                    return <IconComponent className="w-6 h-6" style={{ color: getCategoryColor(renameModal.document.category) }} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-nuvia-deep">
                    {renameModal.document.title || renameModal.document.originalFilename}
                  </p>
                  <p className="text-xs text-nuvia-deep/60">{formatFileSize(renameModal.document.fileSize)}</p>
                </div>
              </div>

              <Input
                value={renameModal.name}
                onChange={(e) => setRenameModal((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nuevo nombre..."
                autoFocus
                className="border-nuvia-silver/30"
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModal({ open: false, document: null, name: "" })} className="border-nuvia-silver/30">
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!renameModal.name.trim()}>
              Renombrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, document: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Mover a papelera
            </DialogTitle>
            <DialogDescription>¿Estás seguro de que quieres mover este documento a la papelera?</DialogDescription>
          </DialogHeader>
          {deleteModal.document && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${getCategoryColor(deleteModal.document.category)}15` }}>
                  {(() => {
                    const IconComponent = getDocumentIcon(deleteModal.document.category, deleteModal.document.mimeType);
                    return (
                      <IconComponent
                        className="w-6 h-6"
                        style={{ color: getCategoryColor(deleteModal.document.category) }}
                      />
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-nuvia-deep">
                    {deleteModal.document.title || deleteModal.document.originalFilename}
                  </p>
                  <p className="text-xs text-nuvia-deep/60">{formatFileSize(deleteModal.document.fileSize)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, document: null })}
              className="border-nuvia-silver/30">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="w-4 h-4 mr-2" />
              Mover a papelera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
