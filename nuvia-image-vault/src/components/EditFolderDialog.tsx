import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type FolderEditable = {
  id: number;
  name: string;
  description?: string | null;
};

interface EditFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderEditable | null;
  onUpdateFolder: (folderId: number, data: { name: string; description?: string }) => Promise<void>;
}

export function EditFolderDialog({
  open,
  onOpenChange,
  folder,
  onUpdateFolder,
}: EditFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // cuando se abre o cambia la carpeta, precarga valores
  useEffect(() => {
    if (!open) return;
    if (!folder) return;

    setName(folder.name ?? "");
    setDescription(folder.description ?? "");
    setError("");
    setIsLoading(false);
  }, [open, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder) return;

    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onUpdateFolder(folder.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Error al actualizar la carpeta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          sm:max-w-[440px]
          border border-gray-200 dark:border-gray-800
          bg-white dark:bg-gray-900
          text-gray-900 dark:text-gray-100
          shadow-2xl
        "
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Editar carpeta</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Modifica el nombre y la descripción de tu carpeta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="edit-folder-name" className="text-gray-700 dark:text-gray-200">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-folder-name"
              placeholder="Ej: Vacaciones 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="
                bg-gray-50 dark:bg-gray-950
                border-gray-200 dark:border-gray-800
                focus-visible:ring-2 focus-visible:ring-gray-400
              "
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="edit-folder-description" className="text-gray-700 dark:text-gray-200">
              Descripción (opcional)
            </Label>
            <Textarea
              id="edit-folder-description"
              placeholder="Describe el contenido de esta carpeta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="
                bg-gray-50 dark:bg-gray-950
                border-gray-200 dark:border-gray-800
                focus-visible:ring-2 focus-visible:ring-gray-400
              "
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900/40">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="
                bg-gray-100 hover:bg-gray-200
                text-gray-800
                border border-gray-200
                dark:bg-gray-800 dark:hover:bg-gray-700
                dark:text-gray-100 dark:border-gray-700
                transition
              "
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="
                bg-gray-900 hover:bg-black
                text-white
                border border-gray-900
                dark:bg-white dark:hover:bg-gray-200
                dark:text-gray-900 dark:border-white
                transition
                disabled:opacity-70
              "
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
