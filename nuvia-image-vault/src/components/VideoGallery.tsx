// src/components/VideoGallery/VideoGallery.tsx
import { useState } from 'react';
import { useVideos } from '@/hooks/useVideos';
import { VideoCard } from './VideoCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Grid3X3, 
  List, 
  Search, 
  Filter,
  RefreshCw,
  Upload
} from 'lucide-react';
import { videoApi } from '@/services/videoApi';

interface VideoGalleryProps {
  viewMode?: 'grid' | 'list';
}

export const VideoGallery = ({ viewMode = 'grid' }: VideoGalleryProps) => {
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'list'>(viewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { videos, loading, error, refetch } = useVideos();

  const handleFavoriteToggle = async (videoId: number) => {
    try {
      await videoApi.toggleFavorite(videoId);
      refetch();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // 🔥 FUNCIÓN CORREGIDA CON AUTENTICACIÓN
  const handleSoftDelete = async (videoId: number) => {
    if (!confirm('¿Seguro que quieres mover este video a la papelera?')) return;

    try {
      // ✅ OBTENER TOKEN DEL LOCALSTORAGE
      const token = localStorage.getItem('authToken');

      if (!token) {
        alert('No estás autenticado. Por favor inicia sesión.');
        return;
      }

      const res = await fetch(`http://localhost:8080/api/videos/${videoId}/soft-delete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ ENVIAR TOKEN JWT
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al mover el video a la papelera');
      }

      alert(data.message || 'Video movido a la papelera correctamente');
      refetch(); // actualiza la lista de videos
    } catch (err: any) {
      console.error('Error en soft delete:', err);
      alert(err.message || 'No se pudo mover el video a la papelera');
    }
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  // Filtrar videos según búsqueda y favoritos
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = !favoritesOnly || video.isFavorite;
    return matchesSearch && matchesFavorites;
  });

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nuvia-deep/40 w-4 h-4" />
            <Input
              placeholder="Buscar videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 border-nuvia-silver/30"
            />
          </div>
          
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className="whitespace-nowrap"
          >
            <Filter className="w-4 h-4 mr-2" />
            Favoritos
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <div className="flex border border-nuvia-silver/30 rounded-lg overflow-hidden">
            <Button
              variant={currentViewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="w-9 h-9 rounded-none"
              onClick={() => setCurrentViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={currentViewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="w-9 h-9 rounded-none"
              onClick={() => setCurrentViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Videos */}
      {loading && videos.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-nuvia-silver/30 rounded-2xl mb-4" />
              <div className="h-4 bg-nuvia-silver/30 rounded mb-2" />
              <div className="h-3 bg-nuvia-silver/30 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-nuvia-peach/20 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-nuvia-mauve" />
          </div>
          <h3 className="text-lg font-semibold text-nuvia-deep mb-2">
            {videos.length === 0 ? 'No hay videos' : 'No se encontraron videos'}
          </h3>
          <p className="text-nuvia-deep/60 mb-4">
            {videos.length === 0 
              ? 'Comienza subiendo tu primer video'
              : 'Intenta con otros términos de búsqueda'
            }
          </p>
        </div>
      ) : (
        <div className={
          currentViewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.videoId}
              video={video}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={handleSoftDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};