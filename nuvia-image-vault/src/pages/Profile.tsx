// src/pages/Profile.tsx
import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Video,
  Folder,
  HardDrive,
  Edit,
  Camera,
  FileText,
  Trash2,
  Star,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useFolders } from "@/hooks/useFolders"; // ¡IMPORTANTE!
import { toast } from "sonner";

const Profile = () => {
  const { profile, stats, loading: profileLoading, error, refetch, updateProfileImage, getProfileImageUrl } = useProfile();
  const { userFolders, loading: foldersLoading } = useFolders(); // Obtener carpetas del usuario
  const [activeTab, setActiveTab] = useState("overview");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcular el número total de álbumes/carpetas del usuario
  const userAlbumCount = userFolders.length;

  // Combinar estados de loading
  const loading = profileLoading || foldersLoading;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato no válido. Usa JPEG, PNG, WebP o GIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Máximo 5MB.");
      return;
    }

    setUploading(true);

    try {
      const result = await updateProfileImage(file);

      if (result.success) {
        toast.success("Imagen de perfil actualizada correctamente");
        await refetch();
      } else {
        toast.error(result.error || "Error al actualizar la imagen");
      }
    } catch (err: any) {
      console.error("Error subiendo imagen:", err);
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatStorage = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 font-semibold mb-4">Error: {error}</p>
              <Button 
                onClick={refetch} 
                className="bg-nuvia-mauve hover:bg-nuvia-mauve/80"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600">No se encontró el perfil</p>
              <Button 
                onClick={refetch} 
                className="mt-4 bg-nuvia-mauve hover:bg-nuvia-mauve/80"
              >
                Cargar perfil
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const profileImageUrl = getProfileImageUrl({ size: 256, variant: 'gradient' });

  return (
    <AppLayout>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">Mi Perfil</h1>
            </div>
          </div>

          {/* Profile Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-1 bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <img
                      src={profileImageUrl}
                      alt={`Avatar de ${profile.username}`}
                      className="w-32 h-32 rounded-full border-4 border-nuvia-mauve shadow-lg object-cover"
                    />
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-nuvia-mauve hover:bg-nuvia-mauve/80 transition-all"
                      onClick={triggerFileInput}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" />
                      )}
                    </Button>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="text-white text-xs">Subiendo...</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-nuvia-deep">{profile.username}</h2>
                    <div className="flex items-center justify-center gap-2 text-nuvia-deep/70">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{profile.email}</span>
                    </div>

                    {profile.location && (
                      <div className="flex items-center justify-center gap-2 text-nuvia-deep/70">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{profile.location}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-nuvia-deep/70">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {profile.role === "admin" && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                      Administrador
                    </Badge>
                  )}

                  <Button className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve/90 hover:to-nuvia-rose/90 transition-all">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </Button>

                  <div className="text-xs text-nuvia-deep/50 text-center">
                    Formatos: JPEG, PNG, WebP, GIF
                    <br />
                    Máximo: 5MB
                  </div>
                </div>

                {profile.bio && (
                  <div className="mt-6 p-4 bg-white/50 rounded-lg border border-nuvia-silver/30">
                    <p className="text-sm text-nuvia-deep/80 text-center italic">"{profile.bio}"</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Imágenes */}
                <Card className="bg-gradient-to-br from-white to-blue-50/50 border border-blue-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-nuvia-deep/70 font-medium">Imágenes</p>
                      <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-nuvia-soft">
                        <ImageIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                      {stats?.imageCount?.toLocaleString() || "0"}
                    </p>
                  </CardContent>
                </Card>

                {/* Videos */}
                <Card className="bg-gradient-to-br from-white to-green-50/50 border border-green-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-nuvia-deep/70 font-medium">Videos</p>
                      <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 shadow-nuvia-soft">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                      {stats?.videoCount?.toLocaleString() || "0"}
                    </p>
                  </CardContent>
                </Card>

                {/* Documentos */}
                <Card className="bg-gradient-to-br from-white to-amber-50/50 border border-amber-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-nuvia-deep/70 font-medium">Documentos</p>
                      <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 shadow-nuvia-soft">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                      {stats?.documentCount?.toLocaleString() || "0"}
                    </p>
                  </CardContent>
                </Card>

                {/* Álbumes - ¡USANDO EL CONTEO REAL DE CARPETAS! */}
                <Card className="bg-gradient-to-br from-white to-red-50/50 border border-red-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-nuvia-deep/70 font-medium">Álbumes</p>
                      <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 shadow-nuvia-soft">
                        <Folder className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                      {userAlbumCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-nuvia-deep/50 mt-1">
                      {!foldersLoading ? "Carpetas activas" : "Cargando..."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Storage Usage */}
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-soft rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 shadow-nuvia-soft">
                      <HardDrive className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-nuvia-deep">Almacenamiento</h3>
                      <p className="text-sm text-nuvia-deep/60">
                        {formatStorage(stats?.storageUsed || 0)} de {formatStorage(stats?.storageLimit || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-nuvia-silver/30 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(stats?.storagePercentage || 0, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-sm text-nuvia-deep/60">
                    <span>{Math.min(Math.round(stats?.storagePercentage || 0), 100)}% usado</span>
                    <span>{formatStorage((stats?.storageLimit || 0) - (stats?.storageUsed || 0))} disponibles</span>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-white to-yellow-50/50 border border-yellow-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4 text-center">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 shadow-nuvia-soft inline-block mb-2">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-nuvia-deep/70 font-medium">Total Favoritos</p>
                    <p className="text-xl font-bold mt-1 text-nuvia-deep">
                      {((stats?.favoriteImageCount || 0) + (stats?.favoriteVideoCount || 0)).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4 text-center">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500 to-gray-700 shadow-nuvia-soft inline-block mb-2">
                      <Trash2 className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-nuvia-deep/70 font-medium">Papelera</p>
                    <p className="text-xl font-bold mt-1 text-nuvia-deep">
                      {stats?.trashCount?.toLocaleString() || "0"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-indigo-50/50 border border-indigo-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4 text-center">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 shadow-nuvia-soft inline-block mb-2">
                      <ImageIcon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-nuvia-deep/70 font-medium">Img. Fav.</p>
                    <p className="text-xl font-bold mt-1 text-nuvia-deep">
                      {stats?.favoriteImageCount?.toLocaleString() || "0"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-100 shadow-nuvia-soft rounded-2xl">
                  <CardContent className="p-4 text-center">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 shadow-nuvia-soft inline-block mb-2">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-nuvia-deep/70 font-medium">Vid. Fav.</p>
                    <p className="text-xl font-bold mt-1 text-nuvia-deep">
                      {stats?.favoriteVideoCount?.toLocaleString() || "0"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl">
            <TabsTrigger
              value="overview"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
            >
              <User className="w-4 h-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
            >
              <Star className="w-4 h-4" />
              Favoritos
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300"
            >
              <Calendar className="w-4 h-4" />
              Actividad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                <CardTitle className="text-nuvia-deep font-semibold">Resumen de Actividad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-nuvia-deep">Información de Cuenta</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Estado:</span>
                        <Badge
                          variant={profile.status === "active" ? "default" : "secondary"}
                          className={
                            profile.status === "active" 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          }
                        >
                          {profile.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Email verificado:</span>
                        <Badge
                          variant={profile.emailVerified ? "default" : "secondary"}
                          className={
                            profile.emailVerified 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-yellow-100 text-yellow-800 border-yellow-200"
                          }
                        >
                          {profile.emailVerified ? "Sí" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Último acceso:</span>
                        <span className="text-nuvia-deep">
                          {profile.lastLogin 
                            ? new Date(profile.lastLogin).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "Nunca"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-nuvia-deep">Estadísticas Rápidas</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Total archivos:</span>
                        <span className="font-semibold text-nuvia-deep">
                          {stats?.totalMediaCount?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Imágenes favoritas:</span>
                        <span className="font-semibold text-nuvia-deep">
                          {stats?.favoriteImageCount?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Videos favoritos:</span>
                        <span className="font-semibold text-nuvia-deep">
                          {stats?.favoriteVideoCount?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Álbumes/Carpetas:</span>
                        <span className="font-semibold text-nuvia-deep">
                          {userAlbumCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                <CardTitle className="text-nuvia-deep font-semibold">Contenido Favorito</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-amber-200">
                    <ImageIcon className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-amber-800 mb-2">Imágenes Favoritas</h3>
                    <p className="text-3xl font-bold text-amber-600 mb-2">
                      {stats?.favoriteImageCount?.toLocaleString() || "0"}
                    </p>
                    <p className="text-amber-700 text-sm">Tus imágenes marcadas como favoritas</p>
                  </div>

                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-emerald-200">
                    <Video className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-emerald-800 mb-2">Videos Favoritos</h3>
                    <p className="text-3xl font-bold text-emerald-600 mb-2">
                      {stats?.favoriteVideoCount?.toLocaleString() || "0"}
                    </p>
                    <p className="text-emerald-700 text-sm">Tus videos marcados como favoritas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="animate-fade-in">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
                <CardTitle className="text-nuvia-deep font-semibold">Historial de Actividad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-nuvia-silver mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-nuvia-deep mb-2">Registro de Actividad</h3>
                  <p className="text-nuvia-deep/70 mb-6">
                    Próximamente podrás ver tu historial completo de actividad en la plataforma.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats?.imageCount?.toLocaleString() || "0"}
                      </p>
                      <p className="text-sm text-blue-700">Imágenes</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-2xl font-bold text-green-600">
                        {stats?.videoCount?.toLocaleString() || "0"}
                      </p>
                      <p className="text-sm text-green-700">Videos</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-2xl font-bold text-amber-600">
                        {stats?.documentCount?.toLocaleString() || "0"}
                      </p>
                      <p className="text-sm text-amber-700">Documentos</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-2xl font-bold text-red-600">
                        {userAlbumCount.toLocaleString()}
                      </p>
                      <p className="text-sm text-red-700">Álbumes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;