// src/components/folders/CreateFolderDialog.tsx
import { useState } from "react";
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

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (data: { name: string; description?: string; color?: string }) => Promise<void>;
}

const FOLDER_COLORS = [
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Morado' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6c757d', label: 'Gris' },
];

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder,
}: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onCreateFolder({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
      });

      // Resetear formulario
      setName("");
      setDescription("");
      setSelectedColor("#3b82f6");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Error al crear la carpeta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear nueva carpeta</DialogTitle>
          <DialogDescription>
            Crea una carpeta personalizada para organizar tus archivos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nombre *</Label>
            <Input
              id="folder-name"
              placeholder="Ej: Vacaciones 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="folder-description">Descripción (opcional)</Label>
            <Textarea
              id="folder-description"
              placeholder="Describe el contenido de esta carpeta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color de la carpeta</Label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  disabled={isLoading}
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color.value
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Botones */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear carpeta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}