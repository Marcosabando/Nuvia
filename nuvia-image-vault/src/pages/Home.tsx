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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { username, stats, loading, error } = useUserStats();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("images");

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1);
    if (activeTab === "upload") {
      setActiveTab("images");
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose">
        <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6">
          {/* Header Section */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white">
                Bienvenido a Nuvia{username ? `, ${username}` : ""}
              </h1>
              <p className="text-sm sm:text-base text-white/80 mt-1">Tu plataforma elegante de gestión multimedia</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200 text-sm">Error cargando estadísticas: {error}</p>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium">Imágenes</p>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                      <Images className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-2 text-nuvia-deep">{loading ? "..." : stats.totalImages}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium">Subidas</p>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                      <Upload className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-2 text-nuvia-deep">{loading ? "..." : stats.todayUploads}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium">Storage</p>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-2 text-nuvia-deep">
                    {loading ? "..." : `${stats.storageUsed} GB`}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-nuvia-deep/70 font-medium">Docs</p>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-2 text-nuvia-deep">{loading ? "..." : stats.totalDocuments || 0}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Tabs Navigation - Stacked on mobile */}
              <div className="w-full overflow-x-auto">
                <TabsList className="inline-flex w-full sm:w-auto bg-white/80 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl p-1">
                  <TabsTrigger
                    value="images"
                    className="flex-1 sm:flex-initial min-w-0 gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300">
                    <Images className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Imágenes</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="videos"
                    className="flex-1 sm:flex-initial min-w-0 gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300">
                    <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Videos</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="documents"
                    className="flex-1 sm:flex-initial min-w-0 gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Documentos</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Upload Button - Full width on mobile */}
              <Button
                onClick={() => setActiveTab("upload")}
                className="w-full sm:w-auto sm:self-end bg-gradient-to-r from-nuvia-peach to-nuvia-rose hover:from-nuvia-peach-dark hover:to-nuvia-rose-dark text-white shadow-nuvia-accent hover:shadow-nuvia-glow transition-all duration-300 hover:scale-105 gap-2 text-sm sm:text-base py-2.5 sm:py-2">
                <Upload className="w-4 h-4" />
                Subir Archivos
              </Button>
            </div>

            <TabsContent value="images" className="space-y-6 animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-nuvia-deep font-semibold text-base sm:text-lg">
                    <Images className="w-4 h-4 sm:w-5 sm:h-5 text-nuvia-mauve flex-shrink-0" />
                    <span>Galería de Imágenes</span>
                    <Badge variant="secondary" className="bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                      {stats.totalImages}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <ImageGallery key={`images-${refreshKey}`} viewMode={viewMode} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="space-y-6 animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-nuvia-deep font-semibold text-base sm:text-lg">
                    <Video className="w-4 h-4 sm:w-5 sm:h-5 text-nuvia-mauve flex-shrink-0" />
                    <span>Galería de Videos</span>
                    <Badge variant="secondary" className="bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                      {stats.totalVideos}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <VideoGallery key={`videos-${refreshKey}`} viewMode={viewMode} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-nuvia-deep font-semibold text-base sm:text-lg">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-nuvia-mauve flex-shrink-0" />
                    <span>Galería de Documentos</span>
                    <Badge variant="secondary" className="bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                      {stats.totalDocuments || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <DocumentsGallery key={`documents-${refreshKey}`} viewMode={viewMode} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="animate-fade-in">
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base sm:text-lg">
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
          <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/90 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <h3 className="font-semibold text-nuvia-deep mb-2 text-sm sm:text-base">Uso de Almacenamiento</h3>
                  <div className="w-full bg-nuvia-silver/30 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((stats.storageUsed / stats.storageLimit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-nuvia-deep/60 mt-2">
                    <span>{stats.storageUsed} GB usados</span>
                    <span>{stats.storageLimit} GB disponibles</span>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                  <p className="text-xl sm:text-2xl font-bold text-nuvia-deep">{stats.storageUsed} GB</p>
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