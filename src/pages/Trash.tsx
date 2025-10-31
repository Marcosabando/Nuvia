import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, RotateCcw, Search, AlertCircle, FileText, Image, Video, Folder, Archive, Clock } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const Trash = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const trashedItems = [
    { id: 1, name: "Documento_Antiguo.pdf", type: "document", size: "1.2 MB", deletedDate: "Hace 2 días", daysUntilPermanent: 28, icon: FileText },
    { id: 2, name: "Foto_Borrosa.jpg", type: "image", size: "3.4 MB", deletedDate: "Hace 5 días", daysUntilPermanent: 25, icon: Image },
    { id: 3, name: "Video_Test.mp4", type: "video", size: "156 MB", deletedDate: "Hace 1 semana", daysUntilPermanent: 23, icon: Video },
    { id: 4, name: "Carpeta_Temporal", type: "folder", size: "245 MB", deletedDate: "Hace 10 días", daysUntilPermanent: 20, icon: Folder },
    { id: 5, name: "Backup_2023.zip", type: "archive", size: "890 MB", deletedDate: "Hace 2 semanas", daysUntilPermanent: 16, icon: Archive },
    { id: 6, name: "Presentación_V1.pptx", type: "document", size: "5.6 MB", deletedDate: "Hace 3 semanas", daysUntilPermanent: 9, icon: FileText },
  ];

  const filteredItems = trashedItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
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
      case "folder":
        return "text-nuvia-deep";
      case "archive":
        return "text-nuvia-silver";
      default:
        return "text-muted-foreground";
    }
  };

  const getDaysLeftBadge = (days: number) => {
    if (days <= 7) {
      return <Badge className="bg-nuvia-rose/15 text-nuvia-rose border-nuvia-rose/40 shadow-nuvia-soft">{days} días restantes</Badge>;
    } else if (days <= 14) {
      return <Badge className="bg-nuvia-peach/15 text-nuvia-peach-dark border-nuvia-peach/40 shadow-nuvia-soft">{days} días restantes</Badge>;
    } else {
      return <Badge className="bg-nuvia-mauve/10 text-nuvia-mauve border-nuvia-mauve/30 shadow-nuvia-soft">{days} días restantes</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold idebar-background text-white font-bold bg-clip-text text-transparent">
              Papelera
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Los elementos se eliminarán permanentemente después de 30 días
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group">
                <Trash2 className="w-4 h-4" />
                Vaciar Papelera
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Vaciar la papelera permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Todos los elementos en la papelera se eliminarán permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-nuvia-rose text-white hover:bg-nuvia-rose/90">
                  Vaciar Papelera
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Alert */}
        <Card className="bg-gradient-to-br from-nuvia-peach/10 to-nuvia-rose/5 border border-nuvia-peach/40 shadow-nuvia-soft rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-nuvia-peach-dark" />
            <p className="text-sm text-nuvia-deep">
              Los archivos en la papelera se eliminarán automáticamente después de 30 días.
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Elementos</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">{trashedItems.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Tamaño Total</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                  <Archive className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">1.3 GB</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Próximo a eliminar</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                  <Clock className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">2</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Seleccionados</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                  <Checkbox className="w-4 h-4 border-white" checked={selectedItems.length > 0} />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">{selectedItems.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve/60" />
            <Input
              placeholder="Buscar en papelera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve focus:ring-nuvia-mauve/20 transition-all duration-smooth"
            />
          </div>
          {selectedItems.length > 0 && (
            <div className="flex gap-2">
              <Button 
                className="text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02]"
                onClick={() => console.log("Restaurar elementos:", selectedItems)}
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar ({selectedItems.length})
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-rose to-nuvia-rose hover:opacity-90 transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02]">
                    <Trash2 className="w-4 h-4" />
                    Eliminar ({selectedItems.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Los {selectedItems.length} elementos seleccionados se eliminarán permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-nuvia-rose text-white hover:bg-nuvia-rose/90">
                      Eliminar Permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Items List */}
        <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-nuvia-peach/30 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                  <tr>
                    <th className="w-10 p-4">
                      <Checkbox
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={toggleAllSelection}
                      />
                    </th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve">Nombre</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden sm:table-cell">Tamaño</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden md:table-cell">Eliminado</th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden lg:table-cell">Tiempo Restante</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <tr key={item.id} className="border-b border-nuvia-peach/20 hover:bg-gradient-to-r hover:from-nuvia-peach/10 hover:to-nuvia-rose/10 transition-all">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nuvia-deep/10 to-nuvia-peach/10 flex items-center justify-center">
                              <Icon className={`w-5 h-5 ${getTypeColor(item.type)}`} />
                            </div>
                            <div>
                              <p className="font-medium text-nuvia-deep">{item.name}</p>
                              <p className="text-xs text-nuvia-deep/70 sm:hidden">{item.size}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-nuvia-deep hidden sm:table-cell">{item.size}</td>
                        <td className="p-4 text-nuvia-deep/70 hidden md:table-cell">{item.deletedDate}</td>
                        <td className="p-4 hidden lg:table-cell">
                          {getDaysLeftBadge(item.daysUntilPermanent)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-nuvia-mauve hover:text-nuvia-deep hover:bg-nuvia-mauve/10 transition-all duration-smooth"
                              onClick={() => console.log("Restaurar:", item.id)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-nuvia-rose hover:text-nuvia-rose hover:bg-nuvia-rose/10 transition-all duration-smooth">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar "{item.name}" permanentemente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. El archivo se eliminará permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="bg-nuvia-rose text-white hover:bg-nuvia-rose/90">
                                    Eliminar Permanentemente
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredItems.length === 0 && (
          <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10">
            <CardContent className="py-12 text-center">
              <Trash2 className="w-12 h-12 mx-auto text-nuvia-mauve/30 mb-4" />
              <p className="text-nuvia-deep">La papelera está vacía</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Trash;