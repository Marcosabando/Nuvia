import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Search,
  Filter,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const Downloads = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const downloads = [
    { id: 1, name: "Proyecto_Final.pdf", type: "document", size: "2.4 MB", date: "Hoy, 14:23", status: "completed", icon: FileText },
    { id: 2, name: "Vacaciones_2024.mp4", type: "video", size: "245 MB", date: "Hoy, 10:15", status: "completed", icon: Video },
    { id: 3, name: "Portfolio_Images.zip", type: "archive", size: "89 MB", date: "Ayer, 18:45", status: "completed", icon: Archive },
    { id: 4, name: "Presentación.pptx", type: "document", size: "5.2 MB", date: "Ayer, 09:30", status: "completed", icon: FileText },
    { id: 5, name: "Banner_Web.png", type: "image", size: "1.8 MB", date: "Hace 2 días", status: "completed", icon: Image },
    { id: 6, name: "Música_Relajante.mp3", type: "audio", size: "8.7 MB", date: "Hace 3 días", status: "completed", icon: Music },
    { id: 7, name: "Tutorial_React.mp4", type: "video", size: "156 MB", date: "Hace 1 semana", status: "downloading", progress: 67, icon: Video },
    { id: 8, name: "Recursos_Diseño.zip", type: "archive", size: "234 MB", date: "Hace 2 semanas", status: "paused", progress: 45, icon: Archive },
  ];

  const filteredDownloads = downloads.filter((download) => {
    const matchesSearch = download.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || download.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-nuvia-peach/15 text-nuvia-peach-dark border-nuvia-peach/40 shadow-nuvia-soft">
            Completado
          </Badge>
        );
      case "downloading":
        return (
          <Badge className="bg-nuvia-rose/15 text-nuvia-rose border-nuvia-rose/40 shadow-nuvia-soft">
            Descargando {progress}%
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-nuvia-mauve/10 text-nuvia-mauve border-nuvia-mauve/30 shadow-nuvia-soft">
            Pausado {progress}%
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "document":
        return "text-nuvia-rose";
      case "video":
        return "text-nuvia-mauve";
      case "image":
        return "text-nuvia-peach";
      case "audio":
        return "text-nuvia-deep";
      case "archive":
        return "text-nuvia-silver";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold idebar-background text-white font-bold bg-clip-text text-transparent">
              Descargas
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Gestiona todos tus archivos descargados
            </p>
          </div>
          <Button className="text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group">
            <Download className="w-4 h-4" />
            Limpiar Completadas
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">En Descarga</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                  <Download className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">2</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Completadas</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                  <Download className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">6</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Tamaño Total</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                  <Archive className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">742 MB</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Velocidad</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                  <Download className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">5.2 MB/s</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve/60" />
            <Input
              placeholder="Buscar descargas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve focus:ring-nuvia-mauve/20 transition-all duration-smooth"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02]">
                <Filter className="w-4 h-4" />
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-nuvia-silver/30">
              <DropdownMenuItem onClick={() => setFilterType("all")} className="text-nuvia-deep hover:bg-nuvia-mauve/10">Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("document")} className="text-nuvia-deep hover:bg-nuvia-mauve/10">Documentos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("video")} className="text-nuvia-deep hover:bg-nuvia-mauve/10">Vídeos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("image")} className="text-nuvia-deep hover:bg-nuvia-mauve/10">Imágenes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("audio")} className="text-nuvia-deep hover:bg-nuvia-mauve/10">Audio</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("archive")} className="text-nuvia-deep hover:bg-nuvia-mauve/10">Archivos</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Downloads List */}
        <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-nuvia-peach/30 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                  <tr>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve">Archivo</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden sm:table-cell">Tamaño</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden md:table-cell">Fecha</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden lg:table-cell">Estado</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDownloads.map((download) => {
                    const Icon = download.icon;
                    return (
                      <tr
                        key={download.id}
                        className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center">
                              <Icon className={`w-5 h-5 ${getTypeColor(download.type)}`} />
                            </div>
                            <div>
                              <p className="font-medium text-nuvia-deep">{download.name}</p>
                              <p className="text-xs text-nuvia-deep/70 sm:hidden">{download.size}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-nuvia-deep hidden sm:table-cell">{download.size}</td>
                        <td className="p-4 text-nuvia-deep/70 hidden md:table-cell">{download.date}</td>
                        <td className="p-4 hidden lg:table-cell">
                          {getStatusBadge(download.status, download.progress)}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-nuvia-mauve hover:text-nuvia-deep hover:bg-nuvia-mauve/10 transition-all duration-smooth">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-nuvia-silver/30">
                              <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Abrir</DropdownMenuItem>
                              <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Mostrar en carpeta</DropdownMenuItem>
                              {download.status === "downloading" && (
                                <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Pausar</DropdownMenuItem>
                              )}
                              {download.status === "paused" && (
                                <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Reanudar</DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-nuvia-rose hover:bg-nuvia-rose/10">Eliminar</DropdownMenuItem>
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

        {filteredDownloads.length === 0 && (
          <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10">
            <CardContent className="py-12 text-center">
              <Download className="w-12 h-12 mx-auto text-nuvia-mauve/30 mb-4" />
              <p className="text-nuvia-mauve/70">No se encontraron descargas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Downloads;