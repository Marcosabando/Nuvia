// src/pages/Home.tsx
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ImageGallery } from "@/components/ImageGallery";
import { VideoGallery } from "@/components/VideoGallery";
import { UploadZone } from "@/components/UploadZone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Images, Upload, TrendingUp, Video, Plus } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";

const Home = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { username, stats, loading, error } = useUserStats();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("images");
  const [selectedCount, setSelectedCount] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
    if (activeTab === "upload") {
      setActiveTab("images");
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Bienvenido a Nuvia{username ? `, ${username}` : ""}
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Tu plataforma elegante de gestión multimedia
            </p>
          </div>

          {/* Mostrar error si existe */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200 text-sm">
                Error cargando estadísticas: {error}
              </p>
            </div>
          )}

          {/* Quick Stats - Responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Imágenes Totales</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                    <Images className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">
                  {loading ? "..." : stats.totalImages}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Subidas Hoy</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                    <Upload className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">
                  {loading ? "..." : stats.todayUploads}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Almacenamiento</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">
                  {loading ? "..." : `${stats.storageUsed} GB`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Vídeos Totales</p>
                  <div className="p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                    <Video className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">
                  {loading ? "..." : stats.totalVideos}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content - Todo dentro de un solo Card */}
        <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
          <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-2xl mb-2">
                  <Images className="w-6 h-6 text-nuvia-mauve" />
                  Galería Multimedia
                </CardTitle>
                <p className="text-nuvia-deep/70 text-sm">
                  Gestiona tus imágenes y videos en un solo lugar
                </p>
              </div>
              
              {/* Contador de seleccionados - Solo mostrar si hay seleccionados */}
              {selectedCount > 0 && (
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-nuvia-silver/30">
                  <span className="text-sm font-medium text-nuvia-deep">
                    {selectedCount} archivo{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Tabs y Botón de Subir - Ahora DENTRO del card header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
              {/* Tabs de Imágenes y Videos - Usando Button en lugar de TabsList para evitar el error */}
              <div className="flex gap-2 bg-white/50 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl p-1">
                <Button
                  variant={activeTab === "images" ? "default" : "ghost"}
                  onClick={() => setActiveTab("images")}
                  className={`gap-2 ${
                    activeTab === "images" 
                      ? "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose text-white" 
                      : "text-nuvia-deep hover:bg-nuvia-peach/20"
                  } transition-all duration-300`}
                >
                  <Images className="w-4 h-4" />
                  Imágenes
                  <Badge variant="secondary" className="ml-1 bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                    {loading ? "..." : stats.totalImages}
                  </Badge>
                </Button>
                <Button
                  variant={activeTab === "videos" ? "default" : "ghost"}
                  onClick={() => setActiveTab("videos")}
                  className={`gap-2 ${
                    activeTab === "videos" 
                      ? "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose text-white" 
                      : "text-nuvia-deep hover:bg-nuvia-peach/20"
                  } transition-all duration-300`}
                >
                  <Video className="w-4 h-4" />
                  Videos
                  <Badge variant="secondary" className="ml-1 bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                    {loading ? "..." : stats.totalVideos}
                  </Badge>
                </Button>
              </div>

              {/* Botón de Subir - Usando Button en lugar de TabsList */}
              <Button
                onClick={() => setActiveTab("upload")}
                className="gap-2 bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve/90 hover:to-nuvia-rose/90 text-white transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                Subir Archivos
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0 text-xs">
                    {selectedCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Contenido de las pestañas */}
            <div className="w-full">
              {/* Pestaña de Galería de Imágenes */}
              {activeTab === "images" && (
                <div className="space-y-6 animate-fade-in">
                  <ImageGallery 
                    key={`images-${refreshKey}`} 
                    viewMode={viewMode}
                  />
                </div>
              )}

              {/* Pestaña de Galería de Videos */}
              {activeTab === "videos" && (
                <div className="space-y-6 animate-fade-in">
                  <VideoGallery 
                    key={`videos-${refreshKey}`} 
                    viewMode={viewMode}
                  />
                </div>
              )}

              {/* Pestaña de Subida */}
              {activeTab === "upload" && (
                <div className="animate-fade-in">
                  <UploadZone onUploadComplete={handleUploadComplete} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Información de uso de almacenamiento */}
        <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-nuvia-deep mb-2">Uso de Almacenamiento</h3>
                <div className="w-full bg-nuvia-silver/30 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min((stats.storageUsed / stats.storageLimit) * 100, 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-nuvia-deep/60 mt-2">
                  <span>{stats.storageUsed} GB usados</span>
                  <span>{stats.storageLimit} GB disponibles</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-nuvia-deep">{stats.storageUsed} GB</p>
                <p className="text-sm text-nuvia-deep/60">de {stats.storageLimit} GB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Home;