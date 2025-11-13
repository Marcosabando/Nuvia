import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  RotateCcw,
  Search,
  AlertCircle,
  Archive,
} from "lucide-react";
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
import { useTrash } from "@/hooks/useTrash";

const Trash = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const {
    trashItems,
    loading,
    error,
    refetch,
    restoreItem,
    permanentDelete,
    emptyTrash,
  } = useTrash();

  // 🔍 Filtrado de búsqueda
  const filteredItems = trashItems.filter((item) =>
    item.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Selección de ítems
  const toggleItemSelection = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item) => item.id));
    }
  };

  // 🎨 Colores por tipo
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
      default:
        return "text-muted-foreground";
    }
  };

  // 🖼️ Helper para construir URLs correctas
const getTrashItemUrl = (item: any): string => {
  if (!item?.originalPath) {
    console.error('Sin originalPath:', item);
    return "";
  }

  let path = item.originalPath.trim();

  // Asegurar que empiece con "uploads/"
  if (!path.startsWith('uploads/')) {
    path = `uploads/${path}`;
  }

  const url = `http://localhost:3000/${path}`;
  console.log('URL generada:', url);
  return url;
};

console.log("DATOS CRUDO DE LA API:", JSON.stringify(trashItems, null, 2));
  // 🕒 Días restantes
  const getDaysLeftBadge = (permanentDeleteAt: string) => {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(permanentDeleteAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    );

    if (days <= 7) {
      return (
        <Badge className="bg-nuvia-rose/15 text-nuvia-rose border-nuvia-rose/40 shadow-nuvia-soft">
          {days} días restantes
        </Badge>
      );
    } else if (days <= 14) {
      return (
        <Badge className="bg-nuvia-peach/15 text-nuvia-peach-dark border-nuvia-peach/40 shadow-nuvia-soft">
          {days} días restantes
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-nuvia-mauve/10 text-nuvia-mauve border-nuvia-mauve/30 shadow-nuvia-soft">
          {days} días restantes
        </Badge>
      );
    }
  };

  // 📊 Tamaño total
  const totalSize = trashItems.reduce(
    (acc, item) => acc + (item.fileSize || 0),
    0
  );
  const formattedSize = (totalSize / (1024 * 1024)).toFixed(2) + " MB";

  // 🧹 Vaciar papelera
  const handleEmptyTrash = async () => {
    await emptyTrash();
    setSelectedItems([]);
  };

  // 🌀 Loading y errores
  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <p className="text-nuvia-mauve animate-pulse">
            Cargando papelera...
          </p>
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
              Papelera
            </h1>
            <p className="text-sm sm:text-base text-white/80 mt-1">
              Los elementos se eliminarán permanentemente después de 30 días
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose text-white font-bold rounded-xl">
                <Trash2 className="w-4 h-4 mr-2" />
                Vaciar Papelera
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Vaciar la papelera permanentemente?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Todos los elementos se
                  eliminarán permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-nuvia-rose text-white hover:bg-nuvia-rose/90"
                  onClick={handleEmptyTrash}
                >
                  Vaciar Papelera
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Alerta */}
        <Card className="bg-gradient-to-br from-nuvia-peach/10 to-nuvia-rose/5 border border-nuvia-peach/40 shadow-nuvia-soft rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-nuvia-peach-dark" />
            <p className="text-sm text-nuvia-deep">
              Los archivos en la papelera se eliminarán automáticamente después
              de 30 días.
            </p>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-nuvia-deep/70">Elementos</p>
              <p className="text-xl font-bold mt-2 text-nuvia-deep">
                {trashItems.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-nuvia-deep/70">Tamaño Total</p>
              <p className="text-xl font-bold mt-2 text-nuvia-deep">
                {formattedSize}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-nuvia-deep/70">Seleccionados</p>
              <p className="text-xl font-bold mt-2 text-nuvia-deep">
                {selectedItems.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Buscar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve/60" />
            <Input
              placeholder="Buscar en papelera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve"
            />
          </div>
        </div>

        {/* Tabla */}
        <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-nuvia-peach/30 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                  <tr>
                    <th className="w-10 p-4">
                      <Checkbox
                        checked={
                          selectedItems.length === filteredItems.length &&
                          filteredItems.length > 0
                        }
                        onCheckedChange={toggleAllSelection}
                      />
                    </th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve">
                      Nombre
                    </th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden sm:table-cell">
                      Tamaño
                    </th>
                    <th className="text-left p-4 font-semibold text-nuvia-mauve hidden lg:table-cell">
                      Tiempo Restante
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-nuvia-peach/20 hover:bg-nuvia-peach/10 transition-all"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </td>
                      <td className="p-4 flex items-center gap-3 text-nuvia-deep">
                        {/* 🔹 Vista previa según tipo */}
                        {item.itemType === "image" ? (
  <img
    key={`img-${item.id}`}  // 🔥 Key único
    src={getTrashItemUrl(item)}
    alt={item.originalName}
    className="w-12 h-12 object-cover rounded-lg border border-nuvia-silver/30 shadow-sm"
    loading="eager"  // 🔥 Carga inmediata
    onError={(e) => {
      console.error('❌ Error cargando:', item.originalName, getTrashItemUrl(item));
      e.currentTarget.style.display = "none";
    }}
    onLoad={() => {
      console.log('✅ Cargada:', item.originalName);
    }}
  />
) : item.itemType === "video" ? (
  <video
    key={`video-${item.id}`}  // 🔥 Key único
    src={getTrashItemUrl(item)}
    className="w-12 h-12 object-cover rounded-lg border border-nuvia-silver/30 shadow-sm"
    muted
    preload="metadata"  // 🔥 Precarga metadatos
  />
) : (
  <Archive className="w-10 h-10 text-nuvia-silver/50" />
)}

                        <span className="truncate max-w-[200px]">
                          {item.originalName}
                        </span>
                      </td>

                      <td className="p-4 text-nuvia-deep/70 hidden sm:table-cell">
                        {(item.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {getDaysLeftBadge(item.permanentDeleteAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-nuvia-mauve hover:text-nuvia-deep"
                            onClick={() => restoreItem(item.id)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-nuvia-rose hover:text-nuvia-rose"
                            onClick={() => permanentDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Vacía */}
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
