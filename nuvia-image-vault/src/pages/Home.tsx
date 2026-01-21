// src/pages/Home.tsx
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import ImageGallery from "@/components/ImageGallery";
import { VideoGallery } from "@/components/VideoGallery";
import DocumentsGallery from "@/components/DocumentsGallery";
import { UploadZone } from "@/components/UploadZone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Images, Upload, TrendingUp, Video, FileText } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const Home = () => {
  const [viewMode] = useState<"grid" | "list">("grid");

  // ✅ incluir refetch para refrescar stats
  const { username, stats, loading, error, refetch } = useUserStats();

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("images");

  // ✅ refresca galerías + stats + sidebar
  const handleUploadComplete = async () => {
    setRefreshKey((prev) => prev + 1);

    // refresca stats (cards)
    await refetch();

    // refresca sidebar (carpetas + itemCount)
    window.dispatchEvent(new Event("folders:refresh"));

    if (activeTab === "upload") {
      setActiveTab("images");
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const storagePercentage =
    typeof (stats as any)?.storagePercentage === "number"
      ? (stats as any).storagePercentage
      : stats?.storageLimit
      ? (stats.storageUsed / stats.storageLimit) * 100
      : 0;

 return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose">
        <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6">
          {/* Header Section */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white">
                Bienvenido a Nuvia{username ? `, ${username}` : ""}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                Tu plataforma elegante de gestión multimedia
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 sm:p-4">
                <p className="text-red-200 text-xs sm:text-sm">Error cargando estadísticas: {error}</p>
              </div>
            )}

            {/* Quick Stats - Ajustado para móviles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-xl sm:rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium truncate">Imágenes Totales</p>
                    <div className="p-1 sm:p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                      <Images className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2 text-nuvia-deep">
                    {loading ? "..." : stats.totalImages}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-xl sm:rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium truncate">Subidas Hoy</p>
                    <div className="p-1 sm:p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                      <Upload className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2 text-nuvia-deep">
                    {loading ? "..." : stats.todayUploads}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-xl sm:rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium truncate">Almacenamiento</p>
                    <div className="p-1 sm:p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2 text-nuvia-deep truncate">
                    {loading ? "..." : `${stats.storageUsed} GB`}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-xl sm:rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium truncate">Documentos</p>
                    <div className="p-1 sm:p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2 text-nuvia-deep">
                    {loading ? "..." : stats.totalDocuments || 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Tabs - FIXED RESPONSIVE */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-3 w-full sm:inline-flex bg-white/80 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl p-1 h-auto">
                  <TabsTrigger 
                    value="images" 
                    className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg"
                  >
                    <Images className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">Imágenes</span>
                  </TabsTrigger>

                  <TabsTrigger 
                    value="videos" 
                    className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg"
                  >
                    <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">Videos</span>
                  </TabsTrigger>

                  <TabsTrigger 
                    value="documents" 
                    className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg"
                  >
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">Documentos</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="w-full sm:w-auto flex justify-end mt-2 sm:mt-0">
                <Button
                  onClick={() => setActiveTab("upload")}
                  className="w-full sm:w-auto bg-gradient-to-r from-nuvia-peach to-nuvia-rose hover:from-nuvia-peach-dark hover:to-nuvia-rose-dark text-white shadow-nuvia-accent hover:shadow-nuvia-glow transition-all duration-300 hover:scale-105 gap-2 text-sm py-2 px-4"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">Subir Archivos</span>
                </Button>
              </div>
            </div>

            {/* Contenido de las pestañas - Se mantiene igual */}
            <TabsContent value="images" className="space-y-4 sm:space-y-6 animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-xl sm:rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-nuvia-deep font-semibold text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <Images className="w-4 h-4 sm:w-5 sm:h-5 text-nuvia-mauve" />
                      Galería de Imágenes
                    </div>
                    <Badge variant="secondary" className="mt-1 sm:mt-0 sm:ml-2 bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                      {loading ? "..." : stats.totalImages} elementos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <ImageGallery key={`images-${refreshKey}`} viewMode={viewMode} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4 sm:space-y-6 animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-xl sm:rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-nuvia-deep font-semibold text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 sm:w-5 sm:h-5 text-nuvia-mauve" />
                      Galería de Videos
                    </div>
                    <Badge variant="secondary" className="mt-1 sm:mt-0 sm:ml-2 bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                      {loading ? "..." : stats.totalVideos} elementos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <VideoGallery key={`videos-${refreshKey}`} viewMode={viewMode} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 sm:space-y-6 animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-xl sm:rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-nuvia-deep font-semibold text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-nuvia-mauve" />
                      Galería de Documentos
                    </div>
                    <Badge variant="secondary" className="mt-1 sm:mt-0 sm:ml-2 bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                      {loading ? "..." : stats.totalDocuments || 0} elementos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <DocumentsGallery key={`documents-${refreshKey}`} viewMode={viewMode} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-xl sm:rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-sm sm:text-base">
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-nuvia-mauve" />
                    Subir Archivos Multimedia
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <UploadZone onUploadComplete={handleUploadComplete} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Storage Usage */}
          <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-soft rounded-xl sm:rounded-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-nuvia-deep mb-2 text-sm sm:text-base">Uso de Almacenamiento</h3>
                  <div className="w-full bg-nuvia-silver/30 rounded-full h-1.5 sm:h-2">
                    <div
                      className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-1.5 sm:h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(storagePercentage || 0, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-nuvia-deep/60 mt-1 sm:mt-2">
                    <span>{stats.storageUsed} GB usados</span>
                    <span>{stats.storageLimit} GB disponibles</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 mt-2 sm:mt-0">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-nuvia-deep">{stats.storageUsed} GB</p>
                  <p className="text-xs sm:text-sm text-nuvia-deep/60">de {stats.storageLimit} GB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;
