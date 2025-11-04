import { useState, useCallback } from "react";
import { Upload, Image, X, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export function UploadZone() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    const mediaFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    if (mediaFiles.length !== files.length) {
      toast({
        title: "Archivos no válidos",
        description: "Solo se permiten archivos de imagen y vídeo",
        variant: "destructive"
      });
    }

    const newUploadFiles: UploadFile[] = mediaFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadingFiles(prev => [...prev, ...newUploadFiles]);

    // Simulate upload progress
    newUploadFiles.forEach(uploadFile => {
      simulateUpload(uploadFile);
    });
  }, [toast]);

  const simulateUpload = useCallback((uploadFile: UploadFile) => {
    const interval = setInterval(() => {
      setUploadingFiles(prev => 
        prev.map(file => {
          if (file.id === uploadFile.id) {
            const newProgress = Math.min(file.progress + Math.random() * 30, 100);
            const newStatus = newProgress === 100 ? 'completed' : 'uploading';
            
            if (newStatus === 'completed') {
              clearInterval(interval);
              toast({
                title: "Subida completada",
                description: `${file.file.name} se ha subido correctamente`,
              });
            }
            
            return { ...file, progress: newProgress, status: newStatus };
          }
          return file;
        })
      );
    }, 500);
  }, [toast]);

  const removeUploadFile = useCallback((id: string) => {
    setUploadingFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card 
        className={`nuvia-dropzone transition-all duration-smooth ${
          dragActive ? 'dragover border-primary bg-primary-light' : 'border-dashed'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-6 md:p-8 lg:p-12 text-center">
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-muted flex items-center justify-center mb-4 md:mb-6 nuvia-glow">
            <Upload className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-muted-foreground" />
          </div>
          
          <h3 className="text-lg md:text-xl font-semibold mb-2 text-foreground">Arrastra tus archivos aquí</h3>
          <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 px-4">
            O haz clic para buscar y seleccionar archivos de tu dispositivo
          </p>
          
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          
          <label htmlFor="file-input">
            <Button 
              className="bg-gradient-primary hover:opacity-90 nuvia-glow"
              asChild
            >
              <span className="cursor-pointer">
                <Image className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Elegir archivos
              </span>
            </Button>
          </label>
          
          <p className="text-xs text-muted-foreground mt-3 md:mt-4">
            Soporta: JPG, PNG, GIF, WebP, MP4, MOV (Máx. 10MB por archivo)
          </p>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subiendo archivos ({uploadingFiles.length})
            </h4>
            
            <div className="space-y-4">
              {uploadingFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {uploadFile.file.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(uploadFile.file)} 
                        alt={uploadFile.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium truncate">{uploadFile.file.name}</p>
                      <div className="flex items-center gap-2">
                        {uploadFile.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeUploadFile(uploadFile.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Progress 
                        value={uploadFile.progress} 
                        className="flex-1 h-2"
                      />
                      <span className="text-sm text-muted-foreground min-w-0">
                        {Math.round(uploadFile.progress)}%
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}