import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart,
  Star,
  Download,
  Share2,
  Search,
  Filter,
  MoreVertical,
  Image,
  Video,
  FileText,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Favorites = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const favorites = [
    { id: 1, name: "vacation-sunset.jpg", type: "image", size: "3.2 MB", date: "Hace 2 días", rating: 5, icon: Image },
    { id: 2, name: "project-presentation.pdf", type: "document", size: "5.8 MB", date: "Hace 1 semana", rating: 4, icon: FileText },
    { id: 3, name: "birthday-video.mp4", type: "video", size: "45.2 MB", date: "Hace 3 días", rating: 5, icon: Video },
    { id: 4, name: "family-photo.jpg", type: "image", size: "2.1 MB", date: "Hace 5 días", rating: 5, icon: Image },
    { id: 5, name: "wedding-ceremony.mp4", type: "video", size: "89.5 MB", date: "Hace 1 semana", rating: 5, icon: Video },
    { id: 6, name: "design-portfolio.pdf", type: "document", size: "12.3 MB", date: "Hace 2 semanas", rating: 4, icon: FileText },
  ];

  const filteredFavorites = favorites.filter((favorite) => {
    const matchesSearch = favorite.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || favorite.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "document":
        return "text-nuvia-rose";
      case "video":
        return "text-nuvia-mauve";
      case "image":
        return "text-nuvia-peach";
      default:
        return "text-muted-foreground";
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < rating
                ? "fill-yellow-500 text-yellow-500"
                : "text-nuvia-silver"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold idebar-background text-white font-bold bg-clip-text text-transparent">
              Favoritos
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Tus archivos más importantes y destacados
            </p>
          </div>
          <Button className="gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all">
            <Heart className="w-5 h-5" />
            Limpiar Favoritos
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Total Favoritos</p>
                <Heart className="w-5 h-5 text-nuvia-rose" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">6</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-rose/10 border border-nuvia-rose/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Imágenes</p>
                <Image className="w-5 h-5 text-nuvia-peach" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">2</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-mauve/10 border border-nuvia-mauve/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Vídeos</p>
                <Video className="w-5 h-5 text-nuvia-mauve" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">2</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-deep/10 border border-nuvia-deep/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-nuvia-mauve">Documentos</p>
                <FileText className="w-5 h-5 text-nuvia-silver" />
              </div>
              <p className="text-2xl font-bold mt-2 text-nuvia-deep">2</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuvia-mauve" />
            <Input
              placeholder="Buscar favoritos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve focus:ring-nuvia-mauve/20 transition-all duration-smooth"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-nuvia-rose via-nuvia-peach to-nuvia-mauve text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all">
                <Filter className="w-5 h-5" />
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
              <DropdownMenuItem onClick={() => setFilterType("all")}>Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("document")}>Documentos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("video")}>Vídeos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("image")}>Imágenes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Favorites List */}
        <Card className="bg-white/95 backdrop-blur-sm rounded-2xl border border-nuvia-peach/20 shadow-nuvia-medium">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-nuvia-peach/30 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                  <tr>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve">Archivo</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden sm:table-cell">Tamaño</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden md:table-cell">Fecha</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden lg:table-cell">Valoración</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFavorites.map((favorite) => {
                    const Icon = favorite.icon;
                    return (
                      <tr
                        key={favorite.id}
                        className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center">
                              <Icon className={`w-5 h-5 ${getTypeColor(favorite.type)}`} />
                            </div>
                            <div>
                              <p className="font-medium text-nuvia-deep">{favorite.name}</p>
                              <p className="text-xs text-nuvia-mauve sm:hidden">{favorite.size}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-nuvia-mauve hidden sm:table-cell">{favorite.size}</td>
                        <td className="p-4 text-nuvia-mauve hidden md:table-cell">{favorite.date}</td>
                        <td className="p-4 hidden lg:table-cell">
                          {renderStars(favorite.rating)}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                              <DropdownMenuItem>Abrir</DropdownMenuItem>
                              <DropdownMenuItem>Descargar</DropdownMenuItem>
                              <DropdownMenuItem>Compartir</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Quitar de favoritos</DropdownMenuItem>
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

        {filteredFavorites.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Heart className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">No se encontraron favoritos</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;