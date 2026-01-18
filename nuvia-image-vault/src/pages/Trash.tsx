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
  FileText,
  Folder,
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
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const {
    trashItems,
    loading,
    error,
    refetch,
    restoreItem,
    permanentDelete,
    emptyTrash,
  } = useTrash();

  const filteredItems = trashItems.filter((item) =>
    item.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debug: ver qué items hay en la papelera
  console.log('🗑️ Trash items detalle:', trashItems.map(item => ({
    id: item.id,
    itemType: item.itemType,
    originalName: item.originalName,
    originalPath: item.originalPath,
    mimeType: item.mimeType
  })));

  const toggleItemSelection = (trashId: number) => {
    setSelectedItems((prev) =>
      prev.includes(trashId)
        ? prev.filter((itemId) => itemId !== trashId)
        : [...prev, trashId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item) => item.trashId));
    }
  };

  const getTrashItemUrl = (item: any): string => {
    if (!item?.originalPath) return "";
    
    let path = item.originalPath.trim();
    
    // Para documentos, usar la ruta específica de documentos
    if (item.itemType === 'document') {
      if (!path.startsWith('uploads/documents/')) {
        path = `uploads/documents/${path}`;
      }
    } else {
      // Para imágenes y videos
      if (!path.startsWith('uploads/')) {
        path = `uploads/${path}`;
      }
    }
    
    return `http://localhost:3000/${path}`;
  };

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

  // Función para formatear tamaños de archivo
  const formatSize = (sizeValue: any): string => {
    // Convertir a número y manejar casos inválidos
    const numValue = Number(sizeValue);
    
    if (isNaN(numValue) || numValue === 0) {
      return "0 B";
    }

    // Detectar si el valor ya viene en MB del backend
    // Si es menor a 1024, probablemente ya está en MB
    let bytes: number;
    
    if (numValue < 1024) {
      // Probablemente ya está en MB, convertir a bytes
      bytes = numValue * 1024 * 1024;
    } else {
      // Probablemente está en bytes
      bytes = numValue;
    }

    // Formatear según el tamaño
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + " KB";
    } else {
      return bytes.toFixed(2) + " B";
    }
  };

  // Calcular tamaño total
  const totalSize = trashItems.reduce((acc, item) => {
    const size = Number(item.fileSize) || 0;
    // Si el tamaño es menor a 1024, asumimos que está en MB
    if (size < 1024) {
      return acc + (size * 1024 * 1024); // Convertir MB a bytes
    }
    return acc + size; // Ya está en bytes
  }, 0);
  
  const formattedSize = formatSize(totalSize);

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setSelectedItems([]);
  };

  const handlePermanentDelete = async (trashId: number) => {
    await permanentDelete(trashId);
    setDeleteItemId(null);
  };

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
                  {filteredItems.map((item, index) => (
                    <tr
                      key={`trash-${item.trashId}-${index}`}
                      className="border-b border-nuvia-peach/20 hover:bg-nuvia-peach/10 transition-all"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedItems.includes(item.trashId)}
                          onCheckedChange={() => toggleItemSelection(item.trashId)}
                        />
                      </td>
                      <td className="p-4 flex items-center gap-3 text-nuvia-deep">
                        {item.itemType === "image" ? (
                          <img
                            src={getTrashItemUrl(item)}
                            alt={item.originalName}
                            className="w-12 h-12 object-cover rounded-lg border border-nuvia-silver/30 shadow-sm"
                            loading="eager"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : item.itemType === "video" ? (
                          <video
                            src={getTrashItemUrl(item)}
                            className="w-12 h-12 object-cover rounded-lg border border-nuvia-silver/30 shadow-sm"
                            muted
                            preload="metadata"
                          />
                        ) : item.itemType === "document" ? (
                          <div className="w-12 h-12 flex items-center justify-center rounded-lg border border-nuvia-silver/30 bg-nuvia-peach/10">
                            <FileText className="w-6 h-6 text-nuvia-mauve" />
                          </div>
                        ) : item.itemType === "folder" ? (
                          <div className="w-12 h-12 flex items-center justify-center rounded-lg border border-nuvia-silver/30 bg-nuvia-mauve/10">
                            <Folder className="w-6 h-6 text-nuvia-deep" />
                          </div>
                        ) : (
                          <Archive className="w-10 h-10 text-nuvia-silver/50" />
                        )}

                        <span className="truncate max-w-[200px]">
                          {item.originalName}
                        </span>
                      </td>

                      <td className="p-4 text-nuvia-deep/70 hidden sm:table-cell">
                        {formatSize(item.fileSize)}
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
                            onClick={() => restoreItem(item.trashId)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-nuvia-rose hover:text-nuvia-rose"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Eliminar permanentemente?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El elemento "{item.originalName}" será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-nuvia-rose text-white hover:bg-nuvia-rose/90"
                                  onClick={() => handlePermanentDelete(item.trashId)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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