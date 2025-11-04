import { useState, useEffect } from "react";
import { VideoService, VideoResponse } from "@/services/video.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2, Clock, Calendar, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoGalleryProps {
  viewMode?: "grid" | "list";
}

export const VideoGallery = ({ viewMode = "grid" }: VideoGalleryProps) => {
  const [videos, setVideos] = useState<VideoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await VideoService.getAll();
      setVideos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este video?")) return;

    try {
      setDeletingId(id);
      await VideoService.delete(id);
      setVideos(videos.filter(v => v.id !== id));
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-nuvia-mauve/30 border-t-nuvia-mauve rounded-full animate-spin" />
          <p className="text-nuvia-deep/60 text-sm">Cargando videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <FileVideo className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 font-medium">Error al cargar videos</p>
        <p className="text-red-500/70 text-sm mt-1">{error}</p>
        <Button 
          onClick={loadVideos}
          className="mt-4 bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:opacity-90"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <FileVideo className="w-16 h-16 text-nuvia-mauve/40 mx-auto mb-4" />
        <p className="text-nuvia-deep/60 text-lg font-medium">No hay videos</p>
        <p className="text-nuvia-deep/40 text-sm mt-1">
          Sube tu primer video para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className={
      viewMode === "grid" 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" 
        : "space-y-4"
    }>
      {videos.map((video) => (
        <Card 
          key={video.id}
          className="group overflow-hidden border-nuvia-silver/30 bg-gradient-to-br from-white to-nuvia-silver/5 hover:shadow-nuvia-glow transition-all duration-300"
        >
          <CardContent className="p-0">
            {/* Video Preview */}
            <div className="relative aspect-video bg-gradient-to-br from-nuvia-deep/5 to-nuvia-mauve/10">
              <video
                src={VideoService.getVideoUrl(video.filePath)}
                className="w-full h-full object-cover"
                preload="metadata"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <Badge className="bg-white/90 text-nuvia-deep border-0 shadow-lg">
                    <Play className="w-3 h-3 mr-1" />
                    Reproducir
                  </Badge>
                  {video.duration && (
                    <Badge className="bg-black/70 text-white border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(video.duration)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-nuvia-deep line-clamp-1">
                  {video.title || video.fileName}
                </h3>
                {video.description && (
                  <p className="text-sm text-nuvia-deep/60 line-clamp-2 mt-1">
                    {video.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-nuvia-deep/50">
                <div className="flex items-center gap-1">
                  <FileVideo className="w-3.5 h-3.5" />
                  <span>{formatFileSize(video.fileSize)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(video.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-nuvia-silver/20">
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:opacity-90 text-white"
                  onClick={() => window.open(VideoService.getVideoUrl(video.filePath), '_blank')}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(video.id)}
                  disabled={deletingId === video.id}
                >
                  {deletingId === video.id ? (
                    <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};