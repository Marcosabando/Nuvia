// 📂 UBICACIÓN: frontend/src/pages/Recent.tsx

import { AppLayout } from "@/components/AppLayout";
import { Clock, Download, Share2, MoreVertical, TrendingUp } from "lucide-react";
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
  
  const { recentItems, stats, loading, error, getFileUrl, getRelativeTime } = useRecent(timeFilter);

  const handleOpen = (name: string, path: string) => {
    window.open(getFileUrl(path), '_blank');
    toast({
      title: "Abriendo archivo",
      description: `${name} se está abriendo...`,
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return "🖼️";
      case "video":
        return "🎬";
      default:
        return "📁";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "image":
        return "bg-gradient-to-r from-nuvia-peach/20 to-nuvia-rose/20 text-nuvia-deep border-nuvia-peach/40";
      case "video":
        return "bg-gradient-to-r from-nuvia-rose/20 to-nuvia-mauve/20 text-nuvia-deep border-nuvia-rose/40";
      default:
        return "bg-gradient-to-r from-nuvia-mauve/10 to-nuvia-peach/10 text-nuvia-deep border-nuvia-mauve/30";
    }
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Recientes
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              {recentItems.length} archivos accedidos recientemente
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setTimeFilter("today")}
              className={timeFilter === "today" 
                ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" 
                : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
            >
              Hoy
            </Button>
            <Button
              size="sm"
              onClick={() => setTimeFilter("week")}
              className={timeFilter === "week" 
                ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" 
                : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
            >
              Esta semana
            </Button>
            <Button
              size="sm"
              onClick={() => setTimeFilter("month")}
              className={timeFilter === "month" 
                ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" 
                : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
            >
              Este mes
            </Button>
            <Button
              size="sm"
              onClick={() => setTimeFilter("all")}
              className={timeFilter === "all" 
                ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" 
                : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
            >
              Todos
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Última actividad</p>
                <Clock className="w-5 h-5 text-nuvia-rose" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                {stats?.lastActivity ? getRelativeTime(stats.lastActivity) : 'Sin actividad'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-rose/10 border border-nuvia-rose/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Más reciente</p>
                <TrendingUp className="w-5 h-5 text-nuvia-peach" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep truncate">
                {stats?.mostRecent?.name || 'Sin datos'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-mauve/10 border border-nuvia-mauve/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Hoy</p>
                <span className="text-xl">📊</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                {stats?.counts.today || 0} archivos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-deep/10 border border-nuvia-deep/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Esta semana</p>
                <span className="text-xl">⚡</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                {stats?.counts.week || 0} archivos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="bg-white/95 backdrop-blur-sm rounded-2xl border border-nuvia-peach/20 shadow-nuvia-medium">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-nuvia-deep">Línea de tiempo</h2>
            <div className="space-y-4">
              {recentItems.map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex gap-4 group hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 p-4 rounded-lg transition-all"
                >
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-nuvia-rose to-nuvia-mauve ring-4 ring-nuvia-rose/20" />
                    {index < recentItems.length - 1 && (
                      <div className="w-0.5 h-20 bg-gradient-to-b from-nuvia-peach/50 to-nuvia-rose/30 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Thumbnail de imagen/video */}
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-nuvia-silver/30 shadow-sm flex-shrink-0 bg-gradient-to-br from-nuvia-deep/5 to-nuvia-peach/5">
                            {item.type === "image" ? (
                              <img 
                                key={`img-${item.id}`}
                                src={getFileUrl(item.thumbnailPath || item.path)} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="eager"
                                onError={(e) => {
                                  console.error('❌ Error cargando imagen:', item.name, getFileUrl(item.thumbnailPath || item.path));
                                  e.currentTarget.style.display = "none";
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-nuvia-peach/20 to-nuvia-rose/20 flex items-center justify-center"><span class="text-2xl">🖼️</span></div>';
                                  }
                                }}
                                onLoad={() => {
                                  console.log('✅ Imagen cargada:', item.name);
                                }}
                              />
                            ) : item.type === "video" ? (
                              item.thumbnailPath ? (
                                <img 
                                  key={`video-thumb-${item.id}`}
                                  src={getFileUrl(item.thumbnailPath)} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  loading="eager"
                                  onError={(e) => {
                                    console.error('❌ Error cargando thumbnail de video:', item.name, getFileUrl(item.thumbnailPath || ''));
                                    e.currentTarget.style.display = "none";
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center"><span class="text-2xl">🎬</span></div>';
                                    }
                                  }}
                                  onLoad={() => {
                                    console.log('✅ Thumbnail de video cargado:', item.name);
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                                  <span className="text-2xl">🎬</span>
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center">
                                <span className="text-2xl">{getIcon(item.type)}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 
                              className="font-medium text-nuvia-deep hover:text-nuvia-rose cursor-pointer transition-colors"
                              onClick={() => handleOpen(item.name, item.path)}
                            >
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-nuvia-deep mt-1">
                              <span>{getRelativeTime(item.accessedAt)}</span>
                              <span>•</span>
                              <span>{item.size}</span>
                              {item.dimensions && (
                                <>
                                  <span>•</span>
                                  <span>{item.dimensions}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-13">
                          <Badge className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                          <span className="text-xs text-nuvia-deep">
                            Subido {getRelativeTime(item.uploadedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg"
                          onClick={() => window.open(getFileUrl(item.path), '_blank')}
                        >
                          <Download className="w-4 h-4 text-nuvia-mauve" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg">
                          <Share2 className="w-4 h-4 text-nuvia-mauve" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg">
                              <MoreVertical className="w-4 h-4 text-nuvia-mauve" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                            <DropdownMenuItem onClick={() => handleOpen(item.name, item.path)}>
                              Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem>Duplicar</DropdownMenuItem>
                            <DropdownMenuItem>Mover a favoritos</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Eliminar
                            </DropdownMenuItem>
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

        {/* Empty State */}
        {recentItems.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
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