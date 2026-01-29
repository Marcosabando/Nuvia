// src/components/DocumentViewer.tsx
import { useMemo, useState, useEffect } from "react";
import { API_CONFIG } from "@/config/api.config";

interface Props {
  documentId: number;
  noHeader?: boolean;
  noActions?: boolean;
}

type ViewMode = "pdf" | "image" | "text" | "office" | "archive" | "unsupported" | "error";

interface DocumentMetadata {
  documentId: number;
  userId: number;
  title: string;
  description: string | null;
  category: string;
  tags: string | null;
  originalFilename: string;
  filename: string;
  documentPath: string;
  fileSize: number;
  mimeType: string;
  pageCount: number | null;
  wordCount: number | null;
  language: string | null;
  isFavorite: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentViewer({ documentId, noHeader = false, noActions = false }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("pdf");
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata | null>(null);
  const [contentType, setContentType] = useState<string>("");

  const previewUrl = useMemo(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token || !documentId) return null;
    return `${API_CONFIG.BASE_URL}/documents/${documentId}/preview?token=${encodeURIComponent(token)}`;
  }, [documentId]);

  const downloadUrl = useMemo(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token || !documentId) return null;
    return `${API_CONFIG.BASE_URL}/documents/${documentId}/download?token=${encodeURIComponent(token)}`;
  }, [documentId]);

  const metadataUrl = useMemo(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token || !documentId) return null;
    return `${API_CONFIG.BASE_URL}/documents/${documentId}`;
  }, [documentId]);

  useEffect(() => {
    if (previewUrl && metadataUrl) {
      fetchDocumentMetadata();
    }
  }, [previewUrl, metadataUrl]);

  const fetchDocumentMetadata = async () => {
    if (!metadataUrl) return;

    console.log("[DOC_VIEWER] Fetching metadata:", metadataUrl);

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(metadataUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const metadata = result.data;
        setDocumentMetadata(metadata);
        
        // Determinar el modo de vista basado en el MIME type
        const mimeType = metadata.mimeType.toLowerCase();
        setContentType(mimeType);
        
        let mode: ViewMode = "unsupported";
        
        if (mimeType === "application/pdf") {
          mode = "pdf";
        } else if (mimeType.startsWith("image/")) {
          mode = "image";
        } else if (
          mimeType.startsWith("text/") ||
          mimeType === "application/json" ||
          mimeType === "application/xml" ||
          mimeType === "text/markdown" ||
          mimeType.includes("javascript") ||
          mimeType.includes("html") ||
          mimeType.includes("css")
        ) {
          mode = "text";
        } else if (
          mimeType.includes("word") ||
          mimeType.includes("excel") ||
          mimeType.includes("powerpoint") ||
          mimeType.includes("officedocument") ||
          mimeType.includes("opendocument") ||
          mimeType === "application/msword" ||
          mimeType === "application/rtf"
        ) {
          mode = "office";
        } else if (
          mimeType.includes("zip") ||
          mimeType.includes("rar") ||
          mimeType.includes("7z") ||
          mimeType.includes("tar") ||
          mimeType.includes("gzip")
        ) {
          mode = "archive";
        }
        
        setViewMode(mode);
        
        // Testear la conexión de preview
        await testPreviewConnection();
      } else {
        throw new Error("Datos del documento no disponibles");
      }
    } catch (err: any) {
      console.error("[DOC_VIEWER] Failed to fetch metadata:", err);
      setError(`Error al obtener información del documento: ${err.message}`);
      setViewMode("error");
      setLoading(false);
    }
  };

  const testPreviewConnection = async () => {
    if (!previewUrl) return;

    console.log("[DOC_VIEWER] Testing preview URL:", previewUrl);

    try {
      const response = await fetch(previewUrl, { method: "HEAD" });

      const debug = {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        acceptRanges: response.headers.get("accept-ranges"),
        contentRange: response.headers.get("content-range"),
        xFrameOptions: response.headers.get("x-frame-options"),
        csp: response.headers.get("content-security-policy"),
        cors: response.headers.get("access-control-allow-origin"),
        timestamp: new Date().toISOString(),
      };

      setDebugInfo(debug);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      setError(null);
    } catch (err: any) {
      console.error("[DOC_VIEWER] Preview test failed:", err);
      setDebugInfo({ error: err.message });
      setError(`Error de conexión: ${err.message}`);
      setViewMode("error");
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    if (!contentType) return "📎";
    
    if (contentType === "application/pdf") return "📄";
    if (contentType.startsWith("image/")) return "🖼️";
    if (contentType.startsWith("text/")) return "📝";
    if (contentType.includes("word")) return "📘";
    if (contentType.includes("excel")) return "📗";
    if (contentType.includes("powerpoint")) return "📙";
    if (contentType.includes("zip") || contentType.includes("rar")) return "📦";
    
    return "📎";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const downloadFile = () => {
    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = documentMetadata?.originalFilename || `document-${documentId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getViewerContent = () => {
    switch (viewMode) {
      case "pdf":
        return (
          <object
            data={previewUrl}
            type="application/pdf"
            className="w-full h-full min-h-[500px]"
            onError={() => {
              console.log("[DOC_VIEWER] PDF object failed, using fallback");
              setViewMode("unsupported");
            }}>
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center p-8">
                <p className="text-gray-600 mb-4">El navegador no puede mostrar el PDF</p>
                <button
                  onClick={openInNewTab}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Abrir en nueva pestaña
                </button>
              </div>
            </div>
          </object>
        );
      
      case "image":
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={previewUrl}
              alt={documentMetadata?.originalFilename || "Documento"}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={() => {
                console.log("[DOC_VIEWER] Image failed to load");
                setError("Error al cargar la imagen");
                setViewMode("error");
              }}
            />
          </div>
        );
      
      case "text":
        return (
          <div className="w-full h-full">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title={documentMetadata?.originalFilename || "Documento de texto"}
              sandbox="allow-same-origin allow-scripts"
              onError={() => {
                console.log("[DOC_VIEWER] Iframe failed to load");
                setError("Error al cargar el documento de texto");
                setViewMode("error");
              }}
            />
          </div>
        );
      
      case "office":
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
              <div className="text-6xl mb-4">{getFileIcon()}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {documentMetadata?.originalFilename}
              </h3>
              <p className="text-gray-600 mb-2">Documento de Office</p>
              <p className="text-sm text-gray-500 mb-6">
                {contentType} • {formatFileSize(documentMetadata?.fileSize || 0)}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={downloadFile}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <span>💾</span>
                  Descargar documento
                </button>
                <button
                  onClick={openInNewTab}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">
                  <span>📤</span>
                  Abrir en nueva pestaña
                </button>
              </div>
            </div>
          </div>
        );
      
      case "archive":
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {documentMetadata?.originalFilename}
              </h3>
              <p className="text-gray-600 mb-2">Archivo comprimido</p>
              <p className="text-sm text-gray-500 mb-6">
                {contentType} • {formatFileSize(documentMetadata?.fileSize || 0)}
              </p>
              <button
                onClick={downloadFile}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <span>💾</span>
                Descargar archivo
              </button>
            </div>
          </div>
        );
      
      case "unsupported":
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
              <div className="text-6xl mb-4">📎</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {documentMetadata?.originalFilename}
              </h3>
              <p className="text-gray-600 mb-2">
                Tipo de archivo no previsualizable
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {contentType} • {formatFileSize(documentMetadata?.fileSize || 0)}
              </p>
              <button
                onClick={downloadFile}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <span>💾</span>
                Descargar archivo
              </button>
            </div>
          </div>
        );
      
      case "error":
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8 bg-red-50 rounded-xl shadow-lg">
              <div className="text-4xl text-red-500 mb-4">❌</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Error al cargar</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={fetchDocumentMetadata}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                  🔄 Reintentar
                </button>
                <button
                  onClick={downloadFile}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                  💾 Descargar
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!previewUrl || !metadataUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <svg className="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No autenticado</h3>
          <p className="text-gray-600">Inicia sesión nuevamente para ver el documento.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando documento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Debug Toggle Button */}
      {!noActions && (
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="absolute top-2 left-2 z-10 bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition"
          title="Toggle Debug Info">
          {showDebug ? "🔍 Hide" : "🔍 Debug"}
        </button>
      )}

      {/* Action Buttons */}
      {!noActions && (
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <button
            onClick={openInNewTab}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition"
            title="Abrir en nueva pestaña">
            📤 Nueva pestaña
          </button>
          <button
            onClick={downloadFile}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition"
            title="Descargar">
            💾 Descargar
          </button>
        </div>
      )}

      {/* Debug Panel */}
      {showDebug && debugInfo && (
        <div className="absolute top-12 left-2 right-2 z-10 bg-yellow-50 border border-yellow-300 rounded p-3 text-xs font-mono max-h-48 overflow-auto shadow-lg">
          <div className="font-bold mb-2 text-yellow-800">🔍 Debug Info:</div>
          <div className="space-y-1">
            <div>
              <strong>Status:</strong> {debugInfo.status}
            </div>
            <div>
              <strong>Content-Type:</strong> {debugInfo.contentType || "N/A"}
            </div>
            <div>
              <strong>Size:</strong>{" "}
              {debugInfo.contentLength ? `${(parseInt(debugInfo.contentLength) / 1024 / 1024).toFixed(2)} MB` : "N/A"}
            </div>
            <div>
              <strong>Mode:</strong> {viewMode}
            </div>
            <div>
              <strong>MIME Type:</strong> {contentType}
            </div>
            <div>
              <strong>Original Filename:</strong> {documentMetadata?.originalFilename || "N/A"}
            </div>
            <div>
              <strong>File Size:</strong> {documentMetadata ? formatFileSize(documentMetadata.fileSize) : "N/A"}
            </div>
            <div>
              <strong>X-Frame-Options:</strong> {debugInfo.xFrameOptions || "none"}
            </div>
            <div>
              <strong>CORS:</strong> {debugInfo.cors || "N/A"}
            </div>
            <div>
              <strong>Accept-Ranges:</strong> {debugInfo.acceptRanges || "N/A"}
            </div>
            <div className="break-all">
              <strong>Preview URL:</strong> {previewUrl}
            </div>
          </div>
        </div>
      )}

      {/* Document Header */}
      {!noHeader && documentMetadata && viewMode !== "error" && (
        <div className="absolute top-12 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFileIcon()}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {documentMetadata.originalFilename}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{contentType}</span>
                <span>•</span>
                <span>{formatFileSize(documentMetadata.fileSize)}</span>
                <span>•</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded">{viewMode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={viewMode === "error" || noHeader ? "h-full" : "pt-20 h-full"}>
        {getViewerContent()}
      </div>
    </div>
  );
}