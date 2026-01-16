import { useMemo, useState, useEffect } from "react";
import { API_CONFIG } from "@/config/api.config";

interface Props {
  documentId: number;
}

type ViewMode = "object" | "iframe" | "link" | "error";

export default function DocumentViewer({ documentId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("object");
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const previewUrl = useMemo(() => {
    const token = localStorage.getItem("authToken");
    if (!token || !documentId) return null;
    // Usar /preview en lugar de /download para evitar descargas automáticas
    return `${API_CONFIG.BASE_URL}/documents/${documentId}/preview?token=${encodeURIComponent(token)}`;
  }, [documentId]);

  useEffect(() => {
    if (previewUrl) {
      testConnection();
    }
  }, [previewUrl]);

  const testConnection = async () => {
    if (!previewUrl) return;

    console.log("[DOC_VIEWER] Testing URL:", previewUrl);

    try {
      // Hacer una petición HEAD en lugar de GET para verificar sin descargar
      const response = await fetch(previewUrl, {
        method: "HEAD",
      });

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
      console.log("[DOC_VIEWER] Debug info:", debug);

      // Si la respuesta es exitosa y es un PDF
      if (response.ok && debug.contentType?.includes("pdf")) {
        setViewMode("object");
        setError(null);
      } else if (!response.ok) {
        setError(`Error ${response.status}: ${response.statusText}`);
        setViewMode("error");
      } else if (!debug.contentType?.includes("pdf")) {
        setError("El archivo no es un PDF válido");
        setViewMode("error");
      }
    } catch (err: any) {
      console.error("[DOC_VIEWER] Connection test failed:", err);
      setDebugInfo({ error: err.message });
      setError(`Error de conexión: ${err.message}`);
      setViewMode("error");
    } finally {
      setLoading(false);
    }
  };

  const handleObjectError = () => {
    console.log("[DOC_VIEWER] Object tag failed, switching to iframe");
    setViewMode("iframe");
    setError(null);
  };

  const handleIframeError = () => {
    console.log("[DOC_VIEWER] Iframe failed, showing link fallback");
    setViewMode("link");
    setError("Tu navegador no puede mostrar PDFs incrustados");
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const downloadFile = async () => {
    if (!previewUrl) return;

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documento-${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[DOC_VIEWER] Download failed:", err);
      alert("Error al descargar el documento");
    }
  };

  if (!previewUrl) {
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
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="absolute top-2 left-2 z-10 bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition"
        title="Toggle Debug Info">
        {showDebug ? "🔍 Hide" : "🔍 Debug"}
      </button>

      {/* Action Buttons */}
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
              <strong>X-Frame-Options:</strong> {debugInfo.xFrameOptions || "none"}
            </div>
            <div>
              <strong>CORS:</strong> {debugInfo.cors || "N/A"}
            </div>
            <div>
              <strong>Accept-Ranges:</strong> {debugInfo.acceptRanges || "N/A"}
            </div>
            <div className="break-all">
              <strong>URL:</strong> {previewUrl}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === "object" && (
        <object
          data={previewUrl}
          type="application/pdf"
          className="w-full h-full"
          onLoad={() => {
            console.log("[DOC_VIEWER] Object loaded successfully");
            setError(null);
          }}
          onError={handleObjectError}>
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
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
      )}

      {viewMode === "iframe" && (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title="Document Preview"
          onLoad={() => {
            console.log("[DOC_VIEWER] Iframe loaded successfully");
            setError(null);
          }}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      )}

      {viewMode === "link" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <svg
              className="w-20 h-20 mx-auto text-purple-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documento disponible</h3>
            <p className="text-gray-600 mb-6">{error || "Tu navegador no puede mostrar el PDF incrustado."}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={openInNewTab}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                <span>📤</span>
                Abrir en nueva pestaña
              </button>
              <button
                onClick={downloadFile}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <span>💾</span>
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center p-8 max-w-md">
            <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar documento</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={testConnection}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              🔄 Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}