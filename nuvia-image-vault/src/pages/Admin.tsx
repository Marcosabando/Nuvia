import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StorageIndicator } from "@/components/ui/storageIndicator";
import { AdminStorageManager } from "@/components/admin/adminStorageManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  HardDrive,
  Image,
  Video,
  Search,
  Shield,
  AlertCircle,
  TrendingUp,
  Database,
  UserX,
  Trash2,
  Eye,
  MoreVertical,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  ArrowUpDown,
  Clock,
  Copy,
  Upload,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_CONFIG } from "@/config/api.config";

// Interfaz de Usuario
interface User {
  id: string;
  userId: number;
  username: string;
  email: string;
  role: string;
  totalImages: number;
  totalVideos: number;
  storageUsed: number;
  storageLimit: number;
  lastLogin: string;
  createdAt: string;
  status: "active" | "suspended" | "inactive";
}

// Estadísticas del admin
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalStorage: number;      // en GB
  usedStorage: number;       // en GB
  totalImages: number;
  totalVideos: number;
  uploadsToday: number;
  systemHealth: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados principales
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalStorage: 0,
    usedStorage: 0,
    totalImages: 0,
    totalVideos: 0,
    uploadsToday: 0,
    systemHealth: 100,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y ordenamiento
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Paginación
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Diálogos
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [newStorageLimit, setNewStorageLimit] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState("overview");

  // ------------------------------------------------------------------
  // Autenticación y carga inicial
  // ------------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token) {
      navigate("/");
      return;
    }
    if (userRole !== "admin") {
      navigate("/home");
      return;
    }
    fetchAdminData();
  }, []);

  // ------------------------------------------------------------------
  // Obtener datos del admin (estadísticas y usuarios)
  // ------------------------------------------------------------------
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      // Estadísticas
      const statsResponse = await fetch(`${API_CONFIG.BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!statsResponse.ok) throw new Error("Error al cargar estadísticas");
      const statsData = await statsResponse.json();
      setStats(statsData.data || statsData);

      // Usuarios
      const usersResponse = await fetch(`${API_CONFIG.BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!usersResponse.ok) throw new Error("Error al cargar usuarios");
      const usersData = await usersResponse.json();
      const rawUsers = usersData.data || usersData;
      const formattedUsers = rawUsers.map((user: any) => ({
        ...user,
        id: user.id || user.userId?.toString() || String(user.userId),
        storageUsed: Number(user.storageUsed) || 0,
        storageLimit: Number(user.storageLimit) || 5,
        totalImages: Number(user.totalImages) || 0,
        totalVideos: Number(user.totalVideos) || 0,
      }));
      setUsers(formattedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de administración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Handlers de usuarios
  // ------------------------------------------------------------------
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error al eliminar usuario");
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado permanentemente",
      });
      setShowDeleteDialog(false);
      fetchAdminData(); // recargar
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suspend }),
      });
      if (!response.ok) throw new Error("Error al cambiar estado");
      toast({
        title: suspend ? "Usuario suspendido" : "Usuario activado",
        description: suspend
          ? "El usuario ha sido suspendido"
          : "El usuario ha sido reactivado",
      });
      setShowSuspendDialog(false);
      fetchAdminData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStorage = async () => {
    if (!selectedUser) return;
    const limit = parseFloat(newStorageLimit);
    if (isNaN(limit) || limit <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un límite válido (número positivo)",
        variant: "destructive",
      });
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/admin/users/${selectedUser.id}/storage`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storageLimit: limit }),
        }
      );
      if (!response.ok) throw new Error("Error al actualizar almacenamiento");
      toast({
        title: "Límite actualizado",
        description: `Nuevo límite: ${limit} GB`,
      });
      setShowStorageDialog(false);
      setNewStorageLimit("");
      fetchAdminData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el límite",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error al exportar");
      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nuvia-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Exportación completada",
        description: "Los datos se han exportado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar los datos",
        variant: "destructive",
      });
    }
  };

  // ------------------------------------------------------------------
  // Lógica de filtrado y ordenamiento
  // ------------------------------------------------------------------
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "username":
        comparison = a.username.localeCompare(b.username);
        break;
      case "email":
        comparison = a.email.localeCompare(b.email);
        break;
      case "storageUsed":
        comparison = a.storageUsed - b.storageUsed;
        break;
      case "totalImages":
        comparison = a.totalImages - b.totalImages;
        break;
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Paginación
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  // ------------------------------------------------------------------
  // Utilidades de formato
  // ------------------------------------------------------------------
  const formatDate = (dateString: string) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStorage = (gb: number) => {
    return `${gb.toFixed(2)} GB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 border-green-500/50";
      case "suspended":
        return "bg-red-500/20 text-red-700 border-red-500/50";
      case "inactive":
        return "bg-gray-500/20 text-gray-700 border-gray-500/50";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-500/50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Activo";
      case "suspended":
        return "Suspendido";
      case "inactive":
        return "Inactivo";
      default:
        return status;
    }
  };

  // ------------------------------------------------------------------
  // Renderizado
  // ------------------------------------------------------------------
  if (loading && users.length === 0) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-nuvia-mauve border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-nuvia-mauve">Cargando panel de administración...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 sm:p-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white flex items-center gap-2 sm:gap-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-nuvia-peach flex-shrink-0" />
                <span className="break-words">Panel de Administración</span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                Control total del sistema Nuvia
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={fetchAdminData}
                variant="outline"
                className="flex-1 sm:flex-none border-white/20 text-white hover:bg-white/10 text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              <Button
                onClick={handleExportData}
                className="flex-1 sm:flex-none bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:shadow-nuvia-glow text-sm sm:text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-col sm:flex-row w-full bg-white/80 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl p-1 gap-1 sm:gap-0">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg py-2 px-3 text-sm w-full sm:flex-1"
            >
              <Database className="w-4 h-4 mr-2" />
              <span>Resumen</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg py-2 px-3 text-sm w-full sm:flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              <span>Usuarios</span>
            </TabsTrigger>
            <TabsTrigger
              value="storage"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg py-2 px-3 text-sm w-full sm:flex-1"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              <span>Sistema</span>
            </TabsTrigger>
            <TabsTrigger
              value="storage-manager"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg py-2 px-3 text-sm w-full sm:flex-1"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span>Gestión</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== PESTAÑA: RESUMEN ========== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Tarjeta Total Usuarios */}
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                        Total Usuarios
                      </p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : stats.totalUsers}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft flex-shrink-0">
                      <Users className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {stats.activeUsers} activos
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Tarjeta Almacenamiento Total */}
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                        Almacenamiento Total
                      </p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : `${stats.usedStorage}GB`}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft flex-shrink-0">
                      <HardDrive className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-nuvia-silver/30 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (stats.usedStorage / stats.totalStorage) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tarjeta Total Multimedia */}
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                        Total Multimedia
                      </p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : stats.totalImages + stats.totalVideos}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft flex-shrink-0">
                      <Database className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-nuvia-deep/60 flex-wrap">
                    <span>{stats.totalImages} img</span>
                    <span>•</span>
                    <span>{stats.totalVideos} vid</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tarjeta Subidas Hoy */}
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                        Subidas Hoy
                      </p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : stats.uploadsToday}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft flex-shrink-0">
                      <Upload className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {stats.totalImages + stats.totalVideos} en total
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vista rápida de usuarios */}
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                  <Users className="w-5 h-5 text-nuvia-mauve" />
                  Vista Rápida de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-nuvia-silver/20">
                        <TableHead className="text-nuvia-deep/70">Usuario</TableHead>
                        <TableHead className="text-nuvia-deep/70">Estado</TableHead>
                        <TableHead className="text-nuvia-deep/70">Almacenamiento</TableHead>
                        <TableHead className="text-nuvia-deep/70">Multimedia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsers.slice(0, 5).map((user) => (
                        <TableRow key={user.id} className="border-nuvia-silver/10">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                                <span className="text-sm font-semibold text-nuvia-deep">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="truncate max-w-[120px]">{user.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(user.status)} text-xs`}>
                              {getStatusText(user.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.storageUsed.toFixed(1)} / {user.storageLimit} GB
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-nuvia-mauve">{user.totalImages} img</span>
                              <span className="text-nuvia-rose">{user.totalVideos} vid</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("users")}
                    className="text-nuvia-mauve hover:text-nuvia-rose"
                  >
                    Ver todos los usuarios ({sortedUsers.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PESTAÑA: USUARIOS (COMPLETA) ========== */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                  <Users className="w-5 h-5 text-nuvia-mauve" />
                  Gestión de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-6">
                {/* Filtros y búsqueda */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve/60" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={filterStatus}
                      onValueChange={(value) => {
                        setFilterStatus(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[150px] bg-white/50 border-nuvia-silver/30">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="suspended">Suspendidos</SelectItem>
                        <SelectItem value="inactive">Inactivos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={sortBy}
                      onValueChange={setSortBy}
                    >
                      <SelectTrigger className="w-[180px] bg-white/50 border-nuvia-silver/30">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Fecha de registro</SelectItem>
                        <SelectItem value="username">Nombre</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="storageUsed">Almacenamiento</SelectItem>
                        <SelectItem value="totalImages">Cantidad de imágenes</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="bg-white/50 border-nuvia-silver/30"
                    >
                      <ArrowUpDown className={`w-4 h-4 transition-transform ${
                        sortOrder === "desc" ? "rotate-180" : ""
                      }`} />
                    </Button>
                  </div>
                </div>

                {/* Tabla de usuarios */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-nuvia-silver/20">
                        <TableHead className="text-nuvia-deep/70">Usuario</TableHead>
                        <TableHead className="text-nuvia-deep/70">Email</TableHead>
                        <TableHead className="text-nuvia-deep/70">Estado</TableHead>
                        <TableHead className="text-nuvia-deep/70">Almacenamiento</TableHead>
                        <TableHead className="text-nuvia-deep/70">Imágenes</TableHead>
                        <TableHead className="text-nuvia-deep/70">Videos</TableHead>
                        <TableHead className="text-nuvia-deep/70">Último acceso</TableHead>
                        <TableHead className="text-nuvia-deep/70">Registro</TableHead>
                        <TableHead className="text-nuvia-deep/70 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-nuvia-deep/60">
                            No se encontraron usuarios
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentUsers.map((user) => (
                          <TableRow key={user.id} className="border-nuvia-silver/10 hover:bg-nuvia-peach/10">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-nuvia-deep">
                                    {user.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="truncate max-w-[120px]">{user.username}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{user.email}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(user.status)} text-xs`}>
                                {getStatusText(user.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{user.storageUsed.toFixed(1)} / {user.storageLimit} GB</div>
                                <div className="w-24 bg-nuvia-silver/30 rounded-full h-1.5 mt-1">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      user.storageUsed / user.storageLimit > 0.8
                                        ? "bg-red-500"
                                        : "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose"
                                    }`}
                                    style={{
                                      width: `${Math.min((user.storageUsed / user.storageLimit) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Image className="w-3 h-3 text-nuvia-mauve" />
                                <span className="text-sm">{user.totalImages}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Video className="w-3 h-3 text-nuvia-rose" />
                                <span className="text-sm">{user.totalVideos}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-nuvia-deep/70">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(user.lastLogin)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-nuvia-deep/70">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(user.createdAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver detalles
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowStorageDialog(true);
                                    }}
                                  >
                                    <HardDrive className="w-4 h-4 mr-2" />
                                    Ajustar almacenamiento
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {user.status === "suspended" ? (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowSuspendDialog(true);
                                      }}
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Reactivar usuario
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowSuspendDialog(true);
                                      }}
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Suspender usuario
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar permanentemente
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación y selector de filas por página */}
                {sortedUsers.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-nuvia-deep/70">
                      <span>Mostrar</span>
                      <Select
                        value={usersPerPage.toString()}
                        onValueChange={(value) => {
                          setUsersPerPage(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20 bg-white/50 border-nuvia-silver/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>por página</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-white/50 border-nuvia-silver/30"
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-nuvia-deep px-2">
                        Página {currentPage} de {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="bg-white/50 border-nuvia-silver/30"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PESTAÑA: SISTEMA ========== */}
          <TabsContent value="storage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StorageIndicator variant="detailed" showRefresh={true} showBreakdown={true} />

              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                    <TrendingUp className="w-5 h-5 text-nuvia-mauve" />
                    Top Usuarios por Almacenamiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-4">
                    {sortedUsers
                      .sort((a, b) => b.storageUsed - a.storageUsed)
                      .slice(0, 5)
                      .map((user, index) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-nuvia-silver/20 bg-white/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-nuvia-deep">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-sm">{user.username}</div>
                              <div className="text-xs text-nuvia-deep/60">
                                {user.storageUsed.toFixed(1)} GB / {user.storageLimit} GB
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-nuvia-deep">
                              {Math.round((user.storageUsed / user.storageLimit) * 100)}%
                            </div>
                            <div className="w-32 bg-nuvia-silver/30 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  user.storageUsed / user.storageLimit > 0.8
                                    ? "bg-red-500"
                                    : "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    (user.storageUsed / user.storageLimit) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
                      <div className="text-sm font-medium text-green-800">
                        Total Almacenamiento
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {stats.totalStorage} GB
                      </div>
                      <div className="text-xs text-green-700">Límite total del sistema</div>
                    </div>
                    <div className="p-4 rounded-lg border border-nuvia-mauve/30 bg-nuvia-mauve/10">
                      <div className="text-sm font-medium text-nuvia-mauve">
                        Almacenamiento Usado
                      </div>
                      <div className="text-2xl font-bold text-nuvia-mauve">
                        {stats.usedStorage.toFixed(1)} GB
                      </div>
                      <div className="text-xs text-nuvia-mauve">
                        {Math.round((stats.usedStorage / stats.totalStorage) * 100)}% del total
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== PESTAÑA: GESTIÓN DE ALMACENAMIENTO ========== */}
          <TabsContent value="storage-manager" className="space-y-6">
            <AdminStorageManager />
          </TabsContent>
        </Tabs>

        {/* ========== DIÁLOGOS MODALES ========== */}

        {/* Diálogo de detalles del usuario */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-nuvia-deep">
                <Users className="w-5 h-5 text-nuvia-mauve" />
                Detalles del Usuario
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-nuvia-peach/10 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-nuvia-mauve/30 to-nuvia-rose/30 flex items-center justify-center">
                    <span className="text-2xl font-bold text-nuvia-deep">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-nuvia-deep">{selectedUser.username}</h3>
                    <p className="text-nuvia-mauve">{selectedUser.email}</p>
                    <Badge className={`${getStatusColor(selectedUser.status)} mt-1`}>
                      {getStatusText(selectedUser.status)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Rol</p>
                    <p className="font-medium capitalize">{selectedUser.role}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Usuario ID</p>
                    <p className="font-medium">{selectedUser.userId}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Fecha de registro</p>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Último acceso</p>
                    <p className="font-medium">{formatDate(selectedUser.lastLogin)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-nuvia-deep">Almacenamiento</p>
                  <div className="flex items-center justify-between text-sm">
                    <span>Usado: {selectedUser.storageUsed.toFixed(2)} GB</span>
                    <span>Límite: {selectedUser.storageLimit} GB</span>
                    <span className="font-bold">
                      {Math.round((selectedUser.storageUsed / selectedUser.storageLimit) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-nuvia-silver/30 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedUser.storageUsed / selectedUser.storageLimit > 0.8
                          ? "bg-red-500"
                          : "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose"
                      }`}
                      style={{
                        width: `${Math.min(
                          (selectedUser.storageUsed / selectedUser.storageLimit) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-nuvia-mauve" />
                      <p className="text-xs text-nuvia-deep/60">Imágenes</p>
                    </div>
                    <p className="text-xl font-bold text-nuvia-deep">{selectedUser.totalImages}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-nuvia-rose" />
                      <p className="text-xs text-nuvia-deep/60">Videos</p>
                    </div>
                    <p className="text-xl font-bold text-nuvia-deep">{selectedUser.totalVideos}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUserDialog(false)}
                className="border-nuvia-silver/30"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de ajuste de almacenamiento */}
        <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-nuvia-deep">
                <HardDrive className="w-5 h-5 text-nuvia-mauve" />
                Ajustar límite de almacenamiento
              </DialogTitle>
              <DialogDescription>
                Ingresa el nuevo límite en GB para {selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="storage-limit">Límite de almacenamiento (GB)</Label>
                <Input
                  id="storage-limit"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="Ej: 10"
                  value={newStorageLimit}
                  onChange={(e) => setNewStorageLimit(e.target.value)}
                  className="bg-white/50 border-nuvia-silver/30"
                />
              </div>
              <div className="text-sm text-nuvia-deep/70">
                Límite actual: {selectedUser?.storageLimit} GB
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStorageDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateStorage}
                className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose text-white"
              >
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación de suspensión/activación */}
        <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-nuvia-deep">
                <UserX className="w-5 h-5 text-nuvia-mauve" />
                {selectedUser?.status === "suspended"
                  ? "Reactivar usuario"
                  : "Suspender usuario"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.status === "suspended"
                  ? `¿Estás seguro de que quieres reactivar a ${selectedUser?.username}?`
                  : `¿Estás seguro de que quieres suspender a ${selectedUser?.username}?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser) {
                    handleSuspendUser(selectedUser.id, selectedUser.status !== "suspended");
                  }
                }}
                className={
                  selectedUser?.status === "suspended"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-nuvia-rose hover:bg-nuvia-rose/90 text-white"
                }
              >
                {selectedUser?.status === "suspended" ? "Reactivar" : "Suspender"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación de eliminación */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Eliminar usuario permanentemente
              </DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. Se eliminarán todos los archivos y datos de{" "}
                {selectedUser?.username}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser) {
                    handleDeleteUser(selectedUser.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Admin;