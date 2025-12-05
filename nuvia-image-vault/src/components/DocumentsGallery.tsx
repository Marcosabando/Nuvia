import { useState, useEffect } from "react";
import {
  MoreHorizontal, Download, Heart, Trash2, Edit3, RefreshCw,
  X, Calendar, Eye, EyeOff, Grid3X3, List, Search, Filter,
  ChevronLeft, ChevronRight, FileText, File, FileImage, FileCode, 
  Archive, FileType, ExternalLink, AlertCircle, Info
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

// Determinar qué tipos de archivo se pueden previsualizar directamente en el navegador
const canPreviewInBrowser = (mimeType: string): boolean => {
  if (!mimeType) return false;
  
  const mime = mimeType.toLowerCase();
  
  // Archivos que el navegador puede mostrar directamente
  return (
    mime.includes('pdf') ||
    mime.startsWith('image/') ||
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('javascript')
  );
};

// Función para obtener URL directa del archivo
const getDirectFileUrl = (document: any): string => {
  if (document.documentPath) {
    return `${API_BASE}/uploads/${document.documentPath}`;
  }
  // Fallback: si no hay documentPath, usar la ruta estándar
  return `${API_BASE}/api/documents/${document.userId || 'user'}/documents/${document.filename || document.originalFilename}`;
};

// Función para obtener URL de descarga
const getDownloadUrl = (documentId: number): string => {
  return `${API_BASE}/api/documents/${documentId}/download`;
};

// Función para obtener URL de vista previa de PDF usando Google Docs Viewer (alternativa gratuita)
const getPdfPreviewUrl = (document: any): string => {
  const directUrl = getDirectFileUrl(document);
  // Codificar la URL para Google Docs Viewer
  const encodedUrl = encodeURIComponent(directUrl);
  return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
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

  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [useAlternativePdfViewer, setUseAlternativePdfViewer] = useState(false);

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

  // Resetear estados de previsualización cuando cambia el documento
  useEffect(() => {
    if (selectedDocument) {
      setPreviewLoading(true);
      setPreviewError(false);
      setUseAlternativePdfViewer(false);
    }
  }, [selectedDocument]);

  const handleImageLoad = () => {
    console.log('✅ Imagen cargada exitosamente');
    setPreviewLoading(false);
  };

  const handleImageError = () => {
    console.error('❌ Error cargando imagen');
    setPreviewLoading(false);
    setPreviewError(true);
  };

  const handleIframeLoad = () => {
    console.log('✅ Iframe cargado exitosamente');
    setPreviewLoading(false);
  };

  const handleIframeError = () => {
    console.error('❌ Error cargando iframe');
    setPreviewLoading(false);
    setPreviewError(true);
  };

  const openDirectFile = () => {
    if (selectedDocument) {
      window.open(getDirectFileUrl(selectedDocument), '_blank', 'noopener,noreferrer');
    }
  };

  // Renderizar contenido del preview
  const renderPreviewContent = () => {
    if (!selectedDocument) return null;

    const directFileUrl = getDirectFileUrl(selectedDocument);
    const canPreview = canPreviewInBrowser(selectedDocument.mimeType);
    const isPdf = selectedDocument.mimeType?.includes('pdf');

    console.log('🔍 Preview info:', {
      document: selectedDocument,
      directFileUrl,
      canPreview,
      mimeType: selectedDocument.mimeType,
      isPdf,
      useAlternativePdfViewer
    });

    if (!canPreview && !isPdf) {
      // Para archivos que no se pueden previsualizar
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-nuvia-mauve/10 flex items-center justify-center">
              {(() => {
                const IconComponent = getDocumentIcon(selectedDocument.category, selectedDocument.mimeType);
                return <IconComponent className="w-12 h-12 text-nuvia-mauve" />;
              })()}
            </div>
            <h3 className="text-xl font-bold text-nuvia-deep mb-2">
              {selectedDocument.title || selectedDocument.originalFilename}
            </h3>
            <p className="text-nuvia-deep/60 mb-4">
              Este tipo de archivo ({selectedDocument.mimeType || 'desconocido'}) no puede previsualizarse directamente en el navegador.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => window.open(getDownloadUrl(selectedDocument.id), "_blank")}
                className="bg-nuvia-mauve hover:bg-nuvia-mauve/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
              <Button
                variant="outline"
                onClick={openDirectFile}
                className="border-nuvia-silver/30"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Intentar abrir
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (selectedDocument.mimeType?.startsWith('image/')) {
      // Para imágenes, usar img tag
      return (
        <div className="h-full flex items-center justify-center bg-gray-100 p-4">
          <img
            src={directFileUrl}
            alt={selectedDocument.originalFilename}
            className="max-w-full max-h-full object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    } else if (isPdf) {
      // Para PDFs - Opción 1: Usar Google Docs Viewer si hay problemas con iframe directo
      if (useAlternativePdfViewer) {
        return (
          <>
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-700">
                  Usando Google Docs Viewer para mostrar el PDF. Si no se carga, 
                  <Button 
                    variant="link" 
                    className="h-auto p-0 ml-1 text-blue-700 underline"
                    onClick={() => window.open(directFileUrl, '_blank')}
                  >
                    ábrelo directamente
                  </Button>
                </p>
              </div>
            </div>
            <iframe
              src={getPdfPreviewUrl(selectedDocument)}
              title={`Vista previa de ${selectedDocument.originalFilename}`}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              allow="fullscreen"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </>
        );
      }
      
      // Opción 2: Intentar iframe directo primero
      return (
        <div className="h-full flex flex-col">
          {previewError && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-yellow-700">
                    Chrome bloqueó la carga del PDF por razones de seguridad.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseAlternativePdfViewer(true)}
                  className="border-yellow-300 text-yellow-700"
                >
                  Usar visor alternativo
                </Button>
              </div>
            </div>
          )}
          
          {!previewError && (
            <iframe
              src={directFileUrl}
              title={`Vista previa de ${selectedDocument.originalFilename}`}
              className="w-full flex-1 border-0"
              sandbox="allow-same-origin allow-scripts"
              allow="fullscreen"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}
          
          {previewError && !useAlternativePdfViewer && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-nuvia-deep mb-2">
                  Bloqueo de seguridad
                </h3>
                <p className="text-nuvia-deep/60 mb-4">
                  Chrome ha bloqueado la carga del PDF por motivos de seguridad.
                </p>
                <div className="space-y-3">
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => setUseAlternativePdfViewer(true)}
                      className="bg-nuvia-mauve hover:bg-nuvia-mauve/90"
                    >
                      Usar visor alternativo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={openDirectFile}
                      className="border-nuvia-silver/30"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir en nueva pestaña
                    </Button>
                  </div>
                  <Button
                    onClick={() => window.open(getDownloadUrl(selectedDocument.id), "_blank")}
                    variant="ghost"
                    size="sm"
                    className="text-nuvia-deep/60 hover:text-nuvia-deep"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } else if (selectedDocument.mimeType?.startsWith('text/') || 
               selectedDocument.mimeType?.includes('json') || 
               selectedDocument.mimeType?.includes('xml') ||
               selectedDocument.mimeType?.includes('html') ||
               selectedDocument.mimeType?.includes('css') ||
               selectedDocument.mimeType?.includes('javascript')) {
      // Para archivos de texto, usar iframe
      return (
        <iframe
          src={directFileUrl}
          title={`Vista previa de ${selectedDocument.originalFilename}`}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts"
          allow="fullscreen"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      );
    }

    // Fallback
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-nuvia-deep/60">No se puede previsualizar este tipo de archivo.</p>
      </div>
    );
  };

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
                const canPreview = canPreviewInBrowser(document.mimeType) || document.mimeType?.includes('pdf');
                
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
                                    {canPreview && (
                                      <DropdownMenuItem onClick={() => setSelectedDocument(document)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Vista previa
                                      </DropdownMenuItem>
                                    )}
                                    
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
                        
                        {canPreview && (
                          <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-4 h-4 text-nuvia-deep" />
                          </div>
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
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canPreview && (
                                <DropdownMenuItem onClick={() => setSelectedDocument(document)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Vista previa
                                </DropdownMenuItem>
                              )}
                              
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

      {/* Modal Vista Previa - CON SOPORTE MEJORADO PARA PDFs */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 border-0 overflow-hidden bg-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista previa de documento</DialogTitle>
            <DialogDescription>
              Vista previa del documento seleccionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-nuvia-silver/30 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${getCategoryColor(selectedDocument.category)}15` }}
                  >
                    {(() => {
                      const IconComponent = getDocumentIcon(selectedDocument.category, selectedDocument.mimeType);
                      return <IconComponent className="w-6 h-6" style={{ color: getCategoryColor(selectedDocument.category) }} />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-nuvia-deep truncate">
                      {selectedDocument.title || selectedDocument.originalFilename}
                    </h3>
                    <p className="text-sm text-nuvia-deep/60">
                      {formatFileSize(selectedDocument.fileSize)} • {selectedDocument.mimeType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedDocument.mimeType?.includes('pdf') && previewError && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseAlternativePdfViewer(true)}
                      className="border-nuvia-silver/30"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Usar visor alternativo
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openDirectFile}
                    className="border-nuvia-silver/30"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir directamente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getDownloadUrl(selectedDocument.id), "_blank")}
                    className="border-nuvia-silver/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedDocument(null)} 
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Contenido del documento */}
              <div className="flex-1 relative min-h-0 overflow-auto">
                {previewLoading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-nuvia-mauve/30 border-t-nuvia-mauve rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-nuvia-deep">Cargando documento...</p>
                      {selectedDocument.mimeType?.includes('pdf') && (
                        <p className="text-sm text-nuvia-deep/40 mt-2">
                          PDF puede tardar unos segundos en cargar
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {renderPreviewContent()}
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
            <DialogDescription>
              Ingresa el nuevo nombre para el documento
            </DialogDescription>
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