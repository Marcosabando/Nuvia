import { useState, useEffect } from "react";
import {
  MoreHorizontal, Download, Heart, Trash2, Edit3, RefreshCw,
  X, Calendar, Eye, EyeOff, Grid3X3, List, Search, Filter,
  ChevronLeft, ChevronRight, FileText, File, FileImage, FileCode, Archive, FileType
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useDocuments } from "@/hooks/useDocuments";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:3000";

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const getDocumentIcon = (category: string, mimeType: string) => {
  if (mimeType?.includes('pdf')) return FileText;
  if (mimeType?.includes('word') || mimeType?.includes('document')) return FileType;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return File;
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return FileImage;
  if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('archive')) return Archive;
  if (mimeType?.includes('text') || mimeType?.includes('markdown')) return FileText;
  if (mimeType?.includes('json') || mimeType?.includes('xml') || mimeType?.includes('code')) return FileCode;
  
  switch (category) {
    case 'office': return FileText;
    case 'text': return FileText;
    case 'design': return FileImage;
    case 'code': return FileCode;
    case 'archive': return Archive;
    default: return File;
  }
};

const getCategoryColor = (category: string) => {
  const colors = {
    office: '#3B82F6',
    text: '#10B981',
    design: '#8B5CF6',
    code: '#F59E0B',
    archive: '#6B7280',
    other: '#9CA3AF'
  };
  return colors[category as keyof typeof colors] || colors.other;
};

const getPreviewUrl = (documentId: number): string => {
  return `${API_BASE}/api/documents/${documentId}/preview`;
};

const getDownloadUrl = (documentId: number): string => {
  return `${API_BASE}/api/documents/${documentId}/download`;
};

export default function DocumentsGallery({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'list'>(viewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [renameModal, setRenameModal] = useState<{ open: boolean; document: any; name: string }>({
    open: false, document: null, name: ""
  });

  const { toast } = useToast();
  const { 
    documents, 
    loading, 
    error, 
    refetch, 
    toggleFavorite, 
    deleteDocument, 
    renameDocument 
  } = useDocuments();

  const showToast = (success: boolean, message: string) => {
    toast({
      title: success ? "✅ Éxito" : "❌ Error",
      description: message,
      ...(success ? { className: "bg-green-50 border-green-200 text-green-800" } : { variant: "destructive" })
    });
  };

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
      showToast(false, error.response?.data?.error || "Error al renombrar");
    }
  };

  const handleToggleFavorite = async (document: any) => {
    try {
      await toggleFavorite(document.id, !document.isFavorite);
      showToast(true, document.isFavorite ? "Quitado de favoritos" : "Añadido a favoritos");
    } catch (error) {
      showToast(false, "Error al actualizar favoritos");
    }
  };

  const handleDelete = async (document: any) => {
    if (!confirm("¿Mover este documento a la papelera?")) return;
    
    try {
      await deleteDocument(document.id);
      setSelectedDocument(null);
      showToast(true, "Documento movido a la papelera");
    } catch (error) {
      showToast(false, "Error al eliminar documento");
    }
  };

  // Filtrar documentos
  const filteredDocuments = documents.filter(document => {
    const matchesSearch = 
      document.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.tags?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFavorites = !favoritesOnly || document.isFavorite;
    
    return matchesSearch && matchesFavorites;
  });

  // Paginación
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  // Resetear página cuando cambian los filtros
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
        <h3 className="text-lg font-semibold text-nuvia-deep mb-2">
          No hay documentos
        </h3>
        <p className="text-nuvia-deep/60 mb-4">
          Comienza subiendo tu primer documento
        </p>
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
        {/* Header con controles */}
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
                favoritesOnly 
                  ? 'bg-nuvia-mauve hover:bg-nuvia-mauve/90 text-white' 
                  : 'text-white'
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

        {/* Grid/List de Documentos */}
        {loading && filteredDocuments.length === 0 ? (
          <div className={
            currentViewMode === 'grid' 
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
              : "space-y-4"
          }>
            {Array.from({ length: 8 }).map((_, i) => (
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
        ) : (
          <>
            <div className={
              currentViewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
                : "space-y-4"
            }>
              {paginatedDocuments.map(document => {
                const displayName = document.title || document.originalFilename;
                const DocumentIcon = getDocumentIcon(document.category, document.mimeType);
                const categoryColor = getCategoryColor(document.category);
                
                if (currentViewMode === 'list') {
                  return (
                    <Card key={document.id} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div 
                            className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg relative overflow-hidden cursor-pointer flex items-center justify-center"
                            onClick={() => setSelectedDocument(document)}
                            style={{ backgroundColor: `${categoryColor}15` }}
                          >
                            <DocumentIcon 
                              className="w-8 h-8 sm:w-10 sm:h-10" 
                              style={{ color: categoryColor }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-nuvia-deep truncate mb-1">
                                  {displayName}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-nuvia-deep/60">
                                  <span>{formatFileSize(document.fileSize)}</span>
                                  {document.pageCount && (
                                    <span>{document.pageCount} páginas</span>
                                  )}
                                </div>
                                {document.description && (
                                  <p className="text-xs text-nuvia-deep/60 mt-1 line-clamp-2">
                                    {document.description}
                                  </p>
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
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-sm border border-nuvia-silver/30"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleToggleFavorite(document)}>
                                      <Heart className={`w-4 h-4 mr-2 ${document.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                      {document.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => window.open(getDownloadUrl(document.id), "_blank")}>
                                      <Download className="w-4 h-4 mr-2" />
                                      Descargar
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => setRenameModal({ 
                                      open: true, 
                                      document, 
                                      name: displayName 
                                    })}>
                                      <Edit3 className="w-4 h-4 mr-2" />
                                      Renombrar
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem 
                                      className="text-red-600" 
                                      onClick={() => handleDelete(document)}
                                    >
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

                return (
                  <Card key={document.id} className="group hover:shadow-lg transition-all duration-300 border border-nuvia-silver/30 overflow-hidden bg-white/95 backdrop-blur-sm">
                    <CardContent className="p-0 relative">
                      <div 
                        className="aspect-square relative overflow-hidden cursor-pointer flex items-center justify-center" 
                        onClick={() => setSelectedDocument(document)}
                        style={{ backgroundColor: `${categoryColor}08` }}
                      >
                        <DocumentIcon 
                          className="w-16 h-16 transition-transform duration-300 group-hover:scale-110" 
                          style={{ color: categoryColor }}
                        />
                        
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
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleToggleFavorite(document)}>
                                <Heart className={`w-4 h-4 mr-2 ${document.isFavorite ? "text-red-500 fill-current" : ""}`} />
                                {document.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => window.open(getDownloadUrl(document.id), "_blank")}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => setRenameModal({ 
                                open: true, 
                                document, 
                                name: displayName 
                              })}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Renombrar
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                className="text-red-600" 
                                onClick={() => handleDelete(document)}
                              >
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
                          {document.isFavorite && (
                            <Heart className="w-3 h-3 text-red-500 fill-current" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-nuvia-silver/30 gap-4">
                <div className="text-sm text-nuvia-deep/60">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDocuments.length)} de {filteredDocuments.length} documentos
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
                              ? 'bg-nuvia-mauve text-white' 
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
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 border-0 bg-gradient-to-br from-nuvia-mauve/20 via-nuvia-rose/15 to-nuvia-peach/20 overflow-y-auto">
          {selectedDocument && (
            <div className="flex flex-col md:flex-row min-h-full">
              <div className="flex-1 flex items-center justify-center p-8 min-h-[40vh] md:min-h-[60vh]">
                <div className="text-center">
                  <div 
                    className="w-32 h-32 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${getCategoryColor(selectedDocument.category)}15` }}
                  >
                    {(() => {
                      const IconComponent = getDocumentIcon(selectedDocument.category, selectedDocument.mimeType);
                      return <IconComponent className="w-16 h-16" style={{ color: getCategoryColor(selectedDocument.category) }} />;
                    })()}
                  </div>
                  <h2 className="text-2xl font-bold text-nuvia-deep mb-2">
                    {selectedDocument.title || selectedDocument.originalFilename}
                  </h2>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => window.open(getPreviewUrl(selectedDocument.id), "_blank")}
                      className="bg-nuvia-mauve hover:bg-nuvia-mauve/90 text-white"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver documento
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.open(getDownloadUrl(selectedDocument.id), "_blank")}
                      className="border-nuvia-silver/30"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-nuvia-silver/30 bg-white/95 backdrop-blur-sm">
                <div className="p-4 border-b border-nuvia-silver/30 flex items-start justify-between sticky top-0 bg-white/95 z-10">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-semibold text-nuvia-deep break-words">
                      {selectedDocument.title || selectedDocument.originalFilename}
                    </h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedDocument(null)} 
                    className="flex-shrink-0"
                  >
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start border-nuvia-silver/30" 
                      onClick={() => window.open(getDownloadUrl(selectedDocument.id), "_blank")}
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
                          name: selectedDocument.title || selectedDocument.originalFilename 
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

      {/* Modal Renombrar */}
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
                  <p className="text-sm font-medium truncate text-nuvia-deep">{renameModal.document.title || renameModal.document.originalFilename}</p>
                  <p className="text-xs text-nuvia-deep/60">{formatFileSize(renameModal.document.fileSize)}</p>
                </div>
              </div>
              <Input
                value={renameModal.name}
                onChange={(e) => setRenameModal(p => ({ ...p, name: e.target.value }))}
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
    </>
  );
}