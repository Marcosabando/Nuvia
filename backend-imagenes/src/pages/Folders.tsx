import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderPlus, Search, Grid3x3, List, MoreVertical } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Folders = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const folders = [
    { id: 1, name: "Documentos", files: 245, size: "2.4 GB", modified: "Hace 2 horas" },
    { id: 2, name: "Proyectos", files: 128, size: "5.1 GB", modified: "Ayer" },
    { id: 3, name: "Personal", files: 89, size: "1.2 GB", modified: "Hace 3 días" },
    { id: 4, name: "Trabajo", files: 456, size: "8.7 GB", modified: "Hace 1 semana" },
    { id: 5, name: "Familia", files: 321, size: "3.4 GB", modified: "Hace 2 semanas" },
    { id: 6, name: "Vacaciones 2024", files: 234, size: "4.5 GB", modified: "Hace 1 mes" },
  ];

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold idebar-background text-white font-bold bg-clip-text text-transparent">
              Carpetas
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Organiza tus archivos en carpetas
            </p>
          </div>
          <Button className="gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] transition-all">
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Carpeta</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuvia-mauve" />
            <Input
              placeholder="Buscar carpetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve focus:ring-nuvia-mauve/20 transition-all duration-smooth"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white" : ""}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Folders Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFolders.map(folder => (
              <Card
                key={folder.id}
                className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center transition-colors">
                      <Folder className="w-6 h-6 text-nuvia-rose" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                        <DropdownMenuItem>Abrir</DropdownMenuItem>
                        <DropdownMenuItem>Renombrar</DropdownMenuItem>
                        <DropdownMenuItem>Compartir</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold text-nuvia-deep">{folder.name}</h3>
                  <p className="text-sm text-nuvia-mauve">{folder.files} archivos</p>
                  <p className="text-xs text-nuvia-deep mt-2">{folder.size}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl border border-nuvia-peach/20 shadow-nuvia-medium">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-nuvia-peach/30 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                    <tr>
                      <th className="text-left p-4 font-semibold text-nuvia-mauve">Nombre</th>
                      <th className="text-left p-4 font-semibold text-nuvia-mauve hidden sm:table-cell">Archivos</th>
                      <th className="text-left p-4 font-semibold text-nuvia-mauve hidden md:table-cell">Tamaño</th>
                      <th className="text-left p-4 font-semibold text-nuvia-mauve hidden lg:table-cell">Modificado</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFolders.map(folder => (
                      <tr key={folder.id} className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center">
                              <Folder className="w-5 h-5 text-nuvia-rose" />
                            </div>
                            <span className="font-medium text-nuvia-deep">{folder.name}</span>
                          </div>
                        </td>
                        <td className="p-4  text-nuvia-deep hidden sm:table-cell">{folder.files}</td>
                        <td className="p-4  text-nuvia-deep hidden md:table-cell">{folder.size}</td>
                        <td className="p-4  text-nuvia-deep hidden lg:table-cell">{folder.modified}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-nuvia-peach/20 rounded-lg text-nuvia-mauve">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl shadow-nuvia-medium">
                              <DropdownMenuItem>Abrir</DropdownMenuItem>
                              <DropdownMenuItem>Renombrar</DropdownMenuItem>
                              <DropdownMenuItem>Compartir</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredFolders.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-nuvia-soft border border-nuvia-peach/30">
            <CardContent className="py-12 text-center">
              <Folder className="w-12 h-12 mx-auto text-nuvia-mauve mb-4" />
              <p className="text-nuvia-mauve">No se encontraron carpetas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Folders;