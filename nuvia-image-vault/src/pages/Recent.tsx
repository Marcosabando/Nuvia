import { AppLayout } from "@/components/AppLayout";
import { Clock, Download, Share2, MoreVertical, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecent } from "@/hooks/useRecent";

export default function Recent() {
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("week");

  const { 
    recentItems, 
    stats, 
    loading, 
    error, 
    getFileUrl, 
    getRelativeTime,
    getFileIcon,
    getFileTypeName 
  } = useRecent(timeFilter);

  const handleOpen = (name: string, path: string) => {
    window.open(getFileUrl(path), "_blank");
    toast({
      title: "Abriendo archivo",
      description: `${name} se está abriendo...`,
    });
  };

  const getIcon = (item: any) => {
    return getFileIcon(item.type, item.mimeType, item.extension);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "image":
        return "bg-gradient-to-r from-nuvia-peach/20 to-nuvia-rose/20 text-nuvia-deep border-nuvia-peach/40";
      case "video":
        return "bg-gradient-to-r from-nuvia-rose/20 to-nuvia-mauve/20 text-nuvia-deep border-nuvia-rose/40";
      case "document":
        return "bg-gradient-to-r from-nuvia-mauve/20 to-nuvia-deep/20 text-nuvia-deep border-nuvia-mauve/40";
      default:
        return "bg-gradient-to-r from-nuvia-mauve/10 to-nuvia-peach/10 text-nuvia-deep border-nuvia-mauve/30";
    }
  };

  const getTypeDisplayName = (item: any) => {
    return getFileTypeName(item.type, item.mimeType);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <p className="text-nuvia-mauve animate-pulse">Cargando recientes...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <p className="text-nuvia-rose">{error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Recientes
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              {recentItems.length} archivos accedidos recientemente
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Última actividad</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">
                  {stats?.lastActivity ? getRelativeTime(stats.lastActivity) : "Sin actividad"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-nuvia-rose/10 border border-nuvia-rose/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Más reciente</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep truncate">
                  {stats?.mostRecent?.name || "Sin datos"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-nuvia-mauve/10 border border-nuvia-mauve/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Hoy</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                    <span className="text-white text-sm">📊</span>
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">
                  {stats?.counts.today || 0} archivos
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-nuvia-deep/10 border border-nuvia-deep/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Esta semana</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                    <span className="text-white text-sm">⚡</span>
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">
                  {stats?.counts.week || 0} archivos
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex gap-2 flex-wrap">
              {(["today", "week", "month", "all"] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  onClick={() => setTimeFilter(filter)}
                  className={
                    timeFilter === filter
                      ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all"
                      : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"
                  }
                >
                  {filter === "today"
                    ? "Hoy"
                    : filter === "week"
                    ? "Esta semana"
                    : filter === "month"
                    ? "Este mes"
                    : "Todos"}
                </Button>
              ))}
            </div>
          </div>

          <Badge variant="secondary" className="bg-white/50 text-nuvia-deep border-nuvia-silver/30">
            {recentItems.length} archivos recientes
          </Badge>
        </div>

        <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-nuvia-deep">Línea de tiempo</h2>
            <div className="space-y-4">
              {recentItems.map((item, index) => (
                <div 
                  key={`${item.type}-${item.id}`} 
                  className="flex gap-4 group hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 p-4 rounded-lg transition-all"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-nuvia-rose to-nuvia-mauve ring-4 ring-nuvia-rose/20" />
                    {index < recentItems.length - 1 && (
                      <div className="w-0.5 h-20 bg-gradient-to-b from-nuvia-peach/50 to-nuvia-rose/30 mt-2" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row items-start gap-3 mb-2">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-nuvia-silver/30 shadow-sm flex-shrink-0 bg-gradient-to-br from-nuvia-deep/5 to-nuvia-peach/5">
                            {item.type === "image" ? (
                              <img
                                src={getFileUrl(item.thumbnailPath || item.path)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : item.type === "video" ? (
                              item.thumbnailPath ? (
                                <img
                                  src={getFileUrl(item.thumbnailPath)}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                                  <span className="text-2xl">🎬</span>
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-nuvia-mauve/10 to-nuvia-peach/10 flex items-center justify-center">
                                <span className="text-2xl">{getIcon(item)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-medium text-nuvia-deep hover:text-nuvia-rose cursor-pointer transition-colors break-words"
                              onClick={() => handleOpen(item.name, item.path)}
                            >
                              {item.title}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-nuvia-deep mt-1">
                              <span className="break-words">{getRelativeTime(item.accessedAt)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="break-words">{item.size}</span>
                              {item.dimensions && item.type !== 'document' && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="break-words">{item.dimensions}</span>
                                </>
                              )}
                              {item.type === 'document' && item.extension && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="break-words text-nuvia-mauve font-medium">
                                    .{item.extension.toUpperCase()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 ml-0 sm:ml-16 mt-2 sm:mt-0">
                          <Badge className={`${getTypeColor(item.type)} text-xs`}>
                            {getTypeDisplayName(item)}
                          </Badge>
                          <span className="text-xs text-nuvia-deep break-words">
                            Subido {getRelativeTime(item.uploadedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-0 sm:ml-4">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg" 
                          onClick={() => window.open(getFileUrl(item.path), "_blank")}
                        >
                          <Download className="w-4 h-4 text-nuvia-mauve" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg"
                        >
                          <Share2 className="w-4 h-4 text-nuvia-mauve" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4 text-nuvia-mauve" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium"
                          >
                            <DropdownMenuItem onClick={() => handleOpen(item.name, item.path)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </DropdownMenuItem>
                            <DropdownMenuItem>Mover a favoritos</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {recentItems.length === 0 && (
          <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">No hay archivos recientes</p>
              <p className="text-sm text-nuvia-mauve/70 mt-2">
                Los archivos que subas aparecerán aquí para un acceso rápido
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}