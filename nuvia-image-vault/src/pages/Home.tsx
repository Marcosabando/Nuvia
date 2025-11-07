// src/pages/Home.tsx
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ImageGallery } from "@/components/ImageGallery";
import { VideoGallery } from "@/components/VideoGallery";
import { UploadZone } from "@/components/UploadZone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Images, Upload, TrendingUp, Video, Grid3X3, List } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";

const Home = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { username, stats, loading, error } = useUserStats();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("images");

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
    // Si estamos en la pestaña de upload, cambiar a la galería correspondiente
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

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <TabsList className="grid w-full sm:w-fit grid-cols-3 bg-white/50 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl">
                <TabsTrigger 
                  value="images" 
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
                >
                  <Images className="w-4 h-4" />
                  Imágenes
                </TabsTrigger>
                <TabsTrigger 
                  value="videos" 
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
                >
                  <Video className="w-4 h-4" />
                  Videos
                </TabsTrigger>
                <TabsTrigger 
                  value="upload" 
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
                >
                  <Upload className="w-4 h-4" />
                  Subir
                </TabsTrigger>
              </TabsList>

              {/* View Mode Toggle - Solo mostrar en galerías */}
              {(activeTab === "images" || activeTab === "videos") && (
                <div className="flex border border-nuvia-silver/30 rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className="w-9 h-9 rounded-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    className="w-9 h-9 rounded-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Badge de estadísticas activas */}
            {(activeTab === "images" || activeTab === "videos") && (
              <Badge variant="secondary" className="bg-white/50 text-nuvia-deep border-nuvia-silver/30">
                {activeTab === "images" 
                  ? `${stats.totalImages} imágenes` 
                  : `${stats.totalVideos} videos`
                }
              </Badge>
            )}
          </div>

          {/* Pestaña de Galería de Imágenes */}
          <TabsContent value="images" className="space-y-6 animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold">
                  <Images className="w-5 h-5 text-nuvia-mauve" />
                  Galería de Imágenes
                  <Badge variant="secondary" className="ml-2 bg-nuvia-mauve/20 text-nuvia-mauve border-0">
                    {stats.totalImages} elementos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ImageGallery key={`images-${refreshKey}`} viewMode={viewMode} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Galería de Videos */}
          <TabsContent value="videos" className="space-y-6 animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold">
                  <Video className="w-5 h-5 text-nuvia-mauve" />
                  Galería de Videos
                  <Badge variant="secondary" className="ml-2 bg-nuvia-mauve/20 text-nuvia-mauve border-0">
                    {stats.totalVideos} elementos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <VideoGallery key={`videos-${refreshKey}`} viewMode={viewMode} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Subida */}
          <TabsContent value="upload" className="animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold">
                  <Upload className="w-5 h-5 text-nuvia-mauve" />
                  Subir Archivos Multimedia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <UploadZone onUploadComplete={handleUploadComplete} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                      width: `${Math.min((stats.storageUsed / 50) * 100, 100)}%` // Asumiendo 50GB como máximo
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-nuvia-deep/60 mt-2">
                  <span>{stats.storageUsed} GB usados</span>
                  <span>50 GB disponibles</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-nuvia-deep">{stats.storageUsed} GB</p>
                <p className="text-sm text-nuvia-deep/60">de 50 GB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Home;