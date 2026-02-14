import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StorageIndicator } from "@/components/ui/storageIndicator";
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Video,
  Folder,
  Edit,
  Camera,
  FileText,
  Trash2,
  Star,
  RefreshCw,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const Profile = () => {
  // ============================================================================
  // HOOKS Y ESTADO
  // ============================================================================
  
  const {
    profile,
    stats,
    loading: profileLoading,
    error,
    refetch,
    updateProfileImage,
    updateProfile,
    getProfileImageUrl,
  } = useProfile();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    bio: "",
    location: "",
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loading = profileLoading;

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (profile) {
      setEditForm({
        username: profile.username || "",
        bio: profile.bio || "",
        location: profile.location || "",
      });
    }
  }, [profile]);

  // ============================================================================
  // FUNCIONES DE VALIDACIÓN
  // ============================================================================
  
  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "Formato no válido. Usa JPEG, PNG, WebP o GIF."
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `La imagen es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Máximo 5MB.`
      };
    }

    if (!file.type.startsWith('image/')) {
      return {
        valid: false,
        error: "El archivo no es una imagen válida."
      };
    }

    return { valid: true };
  };

  // ============================================================================
  // HANDLERS DE EVENTOS
  // ============================================================================
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      const response = await updateProfileImage(file);

      if (response.success) {
        toast.success("✅ Imagen de perfil actualizada correctamente");
        setTimeout(async () => {
          await refetch();
          window.dispatchEvent(new Event("storage:update"));
        }, 500);
      } else {
        handleUploadError(response.error);
      }
    } catch (err: any) {
      toast.error("❌ Error al subir la imagen: " + (err.message || 'Error desconocido'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEditProfile = async () => {
    if (!editForm.username.trim()) {
      toast.error("❌ El nombre de usuario no puede estar vacío");
      return;
    }

    if (editForm.username === profile?.username && 
        editForm.bio === profile?.bio && 
        editForm.location === profile?.location) {
      toast.info("ℹ️ No hay cambios para guardar");
      setIsEditing(false);
      return;
    }

    try {
      const response = await updateProfile(editForm);

      if (response.success) {
        toast.success("✅ Perfil actualizado correctamente");
        setIsEditing(false);
        setTimeout(async () => await refetch(), 500);
      } else {
        handleProfileUpdateError(response.error);
      }
    } catch (err: any) {
      toast.error("❌ Error al actualizar perfil: " + (err.message || 'Error desconocido'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      window.dispatchEvent(new Event("storage:update"));
      toast.success("✅ Perfil actualizado");
    } catch (err) {
      toast.error("❌ Error al actualizar el perfil");
    } finally {
      setRefreshing(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // ============================================================================
  // FUNCIONES DE MANEJO DE ERRORES
  // ============================================================================
  
  const handleUploadError = (error?: string) => {
    let errorMessage = "Error al actualizar la imagen";
    
    if (error?.includes("404")) errorMessage = "Endpoint no encontrado. Contacta al administrador.";
    else if (error?.includes("413")) errorMessage = "Archivo demasiado grande. Máximo 5MB.";
    else if (error?.includes("415")) errorMessage = "Tipo de archivo no permitido.";
    else if (error?.includes("401")) {
      errorMessage = "Sesión expirada.";
      setTimeout(() => window.location.href = '/login', 2000);
    } else if (error) errorMessage = error;
    
    toast.error(`❌ ${errorMessage}`);
  };

  const handleProfileUpdateError = (error?: string) => {
    let errorMessage = "Error al actualizar el perfil";
    
    if (error?.includes("400")) errorMessage = "Datos inválidos. Verifica la información.";
    else if (error?.includes("409")) errorMessage = "El nombre de usuario ya está en uso.";
    else if (error) errorMessage = error;
    
    toast.error(`❌ ${errorMessage}`);
  };

  // ============================================================================
  // ESTADOS DE CARGA Y ERROR
  // ============================================================================
  
  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1"><div className="h-64 bg-gray-200 rounded-lg"></div></div>
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
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 font-semibold mb-4">❌ Error: {error}</p>
              <div className="space-y-3">
                <Button onClick={() => refetch()} className="bg-nuvia-mauve hover:bg-nuvia-mauve/80 w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = '/login';
                  }}
                  className="w-full"
                >
                  Volver al login
                </Button>
              </div>
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
              <p className="text-gray-600 mb-4">No se encontró el perfil</p>
              <Button onClick={() => refetch()} className="bg-nuvia-mauve hover:bg-nuvia-mauve/80">
                <RefreshCw className="w-4 h-4 mr-2" />
                Cargar perfil
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // ============================================================================
  // VARIABLES DERIVADAS
  // ============================================================================
  
  const profileImageUrl = getProfileImageUrl ? 
    getProfileImageUrl({ size: 256, variant: "gradient" }) : 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=8B5CF6&color=fff&size=256`;

  const totalFavorites = (stats?.favoriteImageCount || 0) + 
    (stats?.favoriteVideoCount || 0) + 
    (stats?.favoriteDocumentCount || 0);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <AppLayout>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="hidden"
      />

      {/* Modal de Edición */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Perfil
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de usuario *</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                placeholder="Tu nombre de usuario"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                placeholder="Tu ubicación"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Biografía</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                placeholder="Cuéntanos sobre ti..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleEditProfile} 
              className="bg-nuvia-mauve hover:bg-nuvia-mauve/80"
              disabled={!editForm.username.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">Mi Perfil</h1>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            {refreshing ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Actualizar
          </Button>
        </div>

        {/* Grid Principal */}
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
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=8B5CF6&color=fff&size=256`;
                    }}
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-nuvia-mauve hover:bg-nuvia-mauve/80 transition-all shadow-lg"
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
                      <div className="text-white text-xs font-semibold">Subiendo...</div>
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
                      Miembro desde {new Date(profile.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {profile.role === "admin" && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                    Administrador
                  </Badge>
                )}

                <Button 
                  className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve/90 hover:to-nuvia-rose/90 transition-all shadow-md w-full"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>

                <div className="text-xs text-nuvia-deep/50 text-center">
                  <p>Formatos: JPEG, PNG, WebP, GIF</p>
                  <p>Máximo: 5MB</p>
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
            {/* Grid de stats principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              <Card className="bg-gradient-to-br from-white to-red-50/50 border border-red-100 shadow-nuvia-soft rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-nuvia-deep/70 font-medium">Álbumes</p>
                    <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 shadow-nuvia-soft">
                      <Folder className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-nuvia-deep">
                    {stats?.albumCount?.toLocaleString() || "0"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Storage Indicator */}
            <StorageIndicator variant="detailed" showRefresh={true} showBreakdown={true} />

            {/* Stats Adicionales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-white to-yellow-50/50 border border-yellow-100 shadow-nuvia-soft rounded-2xl">
                <CardContent className="p-4 text-center">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 shadow-nuvia-soft inline-block mb-2">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm text-nuvia-deep/70 font-medium">Favoritos</p>
                  <p className="text-xl font-bold mt-1 text-nuvia-deep">{totalFavorites.toLocaleString()}</p>
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
                  <p className="text-sm text-nuvia-deep/70 font-medium">Img. Favoritas</p>
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
                  <p className="text-sm text-nuvia-deep/70 font-medium">Vid. Favoritos</p>
                  <p className="text-xl font-bold mt-1 text-nuvia-deep">
                    {stats?.favoriteVideoCount?.toLocaleString() || "0"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl p-1">
            <TabsTrigger value="overview" className="gap-2">
              <User className="w-4 h-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="w-4 h-4" />
              Favoritos
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Calendar className="w-4 h-4" />
              Actividad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 rounded-t-2xl">
                <CardTitle className="text-nuvia-deep font-semibold">Resumen de Actividad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-nuvia-deep">Información de Cuenta</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Estado:</span>
                        <Badge className={profile.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {profile.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Email verificado:</span>
                        <Badge className={profile.emailVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {profile.emailVerified ? "Sí" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Rol:</span>
                        <Badge variant="outline">{profile.role === "admin" ? "Administrador" : "Usuario"}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-nuvia-deep">Estadísticas</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Total archivos:</span>
                        <span className="font-semibold text-nuvia-deep">{stats?.totalMediaCount?.toLocaleString() || "0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nuvia-deep/70">Álbumes:</span>
                        <span className="font-semibold text-nuvia-deep">{stats?.albumCount?.toLocaleString() || "0"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 rounded-t-2xl">
                <CardTitle className="text-nuvia-deep font-semibold">Contenido Favorito</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-amber-200">
                    <ImageIcon className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-amber-800 mb-2">Imágenes</h3>
                    <p className="text-3xl font-bold text-amber-600 mb-2">
                      {stats?.favoriteImageCount?.toLocaleString() || "0"}
                    </p>
                  </div>

                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-emerald-200">
                    <Video className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-emerald-800 mb-2">Videos</h3>
                    <p className="text-3xl font-bold text-emerald-600 mb-2">
                      {stats?.favoriteVideoCount?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 rounded-t-2xl">
                <CardTitle className="text-nuvia-deep font-semibold">Actividad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-nuvia-silver mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-nuvia-deep mb-2">Próximamente</h3>
                  <p className="text-nuvia-deep/70">Historial de actividad disponible pronto</p>
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