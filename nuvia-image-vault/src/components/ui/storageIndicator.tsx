// src/components/StorageIndicator.tsx
import { useStorageCalculator } from "@/hooks/useStorageCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HardDrive, RefreshCw, Image, Video, FileText } from "lucide-react";
import { useState } from "react";

interface StorageIndicatorProps {
  variant?: "card" | "compact" | "detailed";
  showRefresh?: boolean;
  showBreakdown?: boolean;
}

export const StorageIndicator = ({ 
  variant = "card", 
  showRefresh = true,
  showBreakdown = true 
}: StorageIndicatorProps) => {
  const { storage, loading, error, recalculate } = useStorageCalculator();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await recalculate();
    } finally {
      // Delay para mostrar la animación
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // ✅ Determinar color según el porcentaje
  const getColorClass = (percentage: number): string => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose";
  };

  // ========================================
  // VARIANT: COMPACT (para mostrar en header/sidebar)
  // ========================================
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-nuvia-silver/30">
        <HardDrive className="w-4 h-4 text-nuvia-deep/70" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-nuvia-deep/70">Almacenamiento</span>
            <span className={`text-xs font-bold ${getColorClass(storage.percentage)}`}>
              {loading ? "..." : `${storage.percentage}%`}
            </span>
          </div>
          <Progress 
            value={loading ? 0 : storage.percentage} 
            className="h-1.5"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-nuvia-deep/50">
              {loading ? "Calculando..." : storage.formatted.used}
            </span>
            <span className="text-xs text-nuvia-deep/40">
              {storage.formatted.limit}
            </span>
          </div>
        </div>
        {showRefresh && (
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  // ========================================
  // VARIANT: DETAILED (para página de perfil/configuración)
  // ========================================
  if (variant === "detailed") {
    return (
      <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
        <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <CardTitle className="text-nuvia-deep font-semibold flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Almacenamiento Detallado
            </CardTitle>
            {showRefresh && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Calculando...' : 'Actualizar'}
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">❌ {error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-nuvia-mauve border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-nuvia-deep/70">Calculando almacenamiento...</p>
            </div>
          )}

          {/* Main Storage Stats */}
          {!loading && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 shadow-nuvia-soft`}>
                      <HardDrive className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-nuvia-deep">Espacio Total</h3>
                      <p className="text-sm text-nuvia-deep/60">
                        {storage.formatted.used} de {storage.formatted.limit}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getColorClass(storage.percentage)} border-current`}
                  >
                    {storage.percentage}% usado
                  </Badge>
                </div>

                <div className="relative">
                  <Progress 
                    value={storage.percentage} 
                    className="h-3"
                  />
                  <div 
                    className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(storage.percentage)}`}
                    style={{ width: `${storage.percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm text-nuvia-deep/60">
                  <span>0%</span>
                  <span className="font-medium">
                    {storage.formatted.available} disponibles
                  </span>
                  <span>100%</span>
                </div>
              </div>

              {/* Breakdown by Type */}
              {showBreakdown && (
                <div className="space-y-3 pt-4 border-t border-nuvia-silver/30">
                  <h4 className="font-semibold text-nuvia-deep text-sm">Desglose por Tipo</h4>
                  
                  {/* Imágenes */}
                  <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                        <Image className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-nuvia-deep">Imágenes</p>
                        <p className="text-xs text-nuvia-deep/60">
                          {storage.byType.images.count} archivo{storage.byType.images.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">
                        {(storage.byType.images.sizeGB).toFixed(2)} GB
                      </p>
                      <p className="text-xs text-nuvia-deep/50">
                        {storage.totalUsed > 0 
                          ? `${Math.round((storage.byType.images.size / storage.totalUsed) * 100)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Videos */}
                  <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-nuvia-deep">Videos</p>
                        <p className="text-xs text-nuvia-deep/60">
                          {storage.byType.videos.count} archivo{storage.byType.videos.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        {(storage.byType.videos.sizeGB).toFixed(2)} GB
                      </p>
                      <p className="text-xs text-nuvia-deep/50">
                        {storage.totalUsed > 0 
                          ? `${Math.round((storage.byType.videos.size / storage.totalUsed) * 100)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Documentos */}
                  <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-nuvia-deep">Documentos</p>
                        <p className="text-xs text-nuvia-deep/60">
                          {storage.byType.documents.count} archivo{storage.byType.documents.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">
                        {(storage.byType.documents.sizeGB).toFixed(2)} GB
                      </p>
                      <p className="text-xs text-nuvia-deep/50">
                        {storage.totalUsed > 0 
                          ? `${Math.round((storage.byType.documents.size / storage.totalUsed) * 100)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning if almost full */}
              {storage.percentage >= 90 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-1">⚠️ Almacenamiento casi lleno</p>
                  <p className="text-xs text-red-600">
                    Considera eliminar archivos innecesarios o actualizar tu plan de almacenamiento.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ========================================
  // VARIANT: CARD (default - para dashboard)
  // ========================================
  return (
    <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 shadow-nuvia-soft">
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-nuvia-deep">Almacenamiento</h3>
              <p className="text-sm text-nuvia-deep/60">
                {loading ? "Calculando..." : `${storage.formatted.used} de ${storage.formatted.limit}`}
              </p>
            </div>
          </div>
          {showRefresh && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="w-8 h-8"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="relative mb-2">
          <Progress value={loading ? 0 : storage.percentage} className="h-3" />
          {!loading && (
            <div 
              className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(storage.percentage)}`}
              style={{ width: `${storage.percentage}%` }}
            />
          )}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-nuvia-deep/60">
            {loading ? "..." : `${storage.percentage}% usado`}
          </span>
          <span className="font-medium text-nuvia-deep">
            {loading ? "..." : storage.formatted.available} disponibles
          </span>
        </div>

        {storage.percentage >= 90 && !loading && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600 font-medium">⚠️ Espacio casi lleno</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};