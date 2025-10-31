import { AppLayout } from "@/components/AppLayout";
import { Clock, Download, Share2, Trash2, MoreVertical, TrendingUp } from "lucide-react";
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

interface RecentItem {
  id: string;
  name: string;
  type: "image" | "video" | "document" | "audio";
  size: string;
  accessedAt: string;
  modifiedAt: string;
  views: number;
}

export default function Recent() {
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("week");

  // Mock data - en producción vendría de una API
  const recentItems: RecentItem[] = [
    {
      id: "1",
      name: "presentation-final.pptx",
      type: "document",
      size: "8.4 MB",
      accessedAt: "Hace 30 minutos",
      modifiedAt: "Hace 2 horas",
      views: 12,
    },
    {
      id: "2",
      name: "meeting-recording.mp4",
      type: "video",
      size: "125.3 MB",
      accessedAt: "Hace 1 hora",
      modifiedAt: "Hace 3 horas",
      views: 5,
    },
    {
      id: "3",
      name: "design-mockup.jpg",
      type: "image",
      size: "4.2 MB",
      accessedAt: "Hace 2 horas",
      modifiedAt: "Ayer",
      views: 23,
    },
    {
      id: "4",
      name: "podcast-episode.mp3",
      type: "audio",
      size: "15.7 MB",
      accessedAt: "Hace 3 horas",
      modifiedAt: "Hace 2 días",
      views: 8,
    },
    {
      id: "5",
      name: "budget-2024.xlsx",
      type: "document",
      size: "2.1 MB",
      accessedAt: "Hace 5 horas",
      modifiedAt: "Hace 1 semana",
      views: 45,
    },
  ];

  const handleOpen = (name: string) => {
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
      case "document":
        return "📄";
      case "audio":
        return "🎵";
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
      case "document":
        return "bg-gradient-to-r from-nuvia-mauve/20 to-nuvia-peach/20 text-nuvia-deep border-nuvia-mauve/40";
      case "audio":
        return "bg-gradient-to-r from-nuvia-deep/20 to-nuvia-silver/20 text-nuvia-deep border-nuvia-deep/40";
      default:
        return "bg-gradient-to-r from-nuvia-mauve/10 to-nuvia-peach/10 text-nuvia-deep border-nuvia-mauve/30";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold idebar-background text-white  font-bold bg-clip-text text-transparent">
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
              className={timeFilter === "today" ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
            >
              Hoy
            </Button>
            <Button
              size="sm"
              onClick={() => setTimeFilter("week")}
              className={timeFilter === "week" ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
            >
              Esta semana
            </Button>
            <Button
              size="sm"
              onClick={() => setTimeFilter("month")}
              className={timeFilter === "month" ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
            >
              Este mes
            </Button>
            <Button
              size="sm"
              onClick={() => setTimeFilter("all")}
              className={timeFilter === "all" ? "gap-2 px-4 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all" : "gap-2 px-4 rounded-xl bg-white/50 border border-nuvia-silver/30 text-nuvia-mauve hover:bg-nuvia-peach/10 transition-all"}
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
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">Hace 30 min</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-rose/10 border border-nuvia-rose/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Más visto</p>
                <TrendingUp className="w-5 h-5 text-nuvia-peach" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">budget-2024</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-mauve/10 border border-nuvia-mauve/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Total vistas</p>
                <span className="text-xl">📊</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">93 vistas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-deep/10 border border-nuvia-deep/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Acceso rápido</p>
                <span className="text-xl">⚡</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">5 archivos</p>
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
                  key={item.id}
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
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center">
                            <span className="text-xl">{getIcon(item.type)}</span>
                          </div>
                          <div>
                            <h3 
                              className="font-medium text-nuvia-deep hover:text-nuvia-rose cursor-pointer transition-colors"
                              onClick={() => handleOpen(item.name)}
                            >
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-nuvia-deep mt-1">
                              <span>{item.accessedAt}</span>
                              <span>•</span>
                              <span>{item.size}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                👁️ {item.views} vistas
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-13">
                          <Badge className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                          <span className="text-xs text-nuvia-deep">
                            Modificado {item.modifiedAt}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg">
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
                            <DropdownMenuItem>Abrir</DropdownMenuItem>
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
                Los archivos que abras aparecerán aquí para un acceso rápido
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}