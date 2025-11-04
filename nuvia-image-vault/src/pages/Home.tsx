import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ImageGallery } from "@/components/ImageGallery";
import { UploadZone } from "@/components/UploadZone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Images, Upload, TrendingUp, Video } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";

const Home = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { username, stats, loading, error } = useUserStats();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
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
        <Tabs defaultValue="gallery" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="grid w-full sm:w-fit grid-cols-2 bg-white/50 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl">
              <TabsTrigger 
                value="gallery" 
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
              >
                <Images className="w-4 h-4" />
                Galería
              </TabsTrigger>
              <TabsTrigger 
                value="upload" 
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
              >
                <Upload className="w-4 h-4" />
                Subir
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Badge className="bg-nuvia-peach/15 text-nuvia-peach-dark border-nuvia-peach/40 shadow-nuvia-soft">
                Todos los archivos
              </Badge>
            </div>
          </div>

          <TabsContent value="gallery" className="space-y-6 animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold">
                  <Images className="w-5 h-5 text-nuvia-mauve" />
                  Galería de Multimedia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ImageGallery key={refreshKey} viewMode={viewMode} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardContent className="p-6">
                <UploadZone onUploadComplete={handleUploadComplete} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Home;