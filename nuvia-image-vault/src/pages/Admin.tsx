// src/pages/Admin.tsx
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StorageIndicator } from "@/components/ui/storageIndicator"; // Importar el componente
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Añadir Tabs

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

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalStorage: number;
  usedStorage: number;
  totalImages: number;
  totalVideos: number;
  uploadsToday: number;
  systemHealth: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [newStorageLimit, setNewStorageLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("overview"); // Para las tabs

  const [usersPerPage, setUsersPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Verificar autenticación antes de cargar datos
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    console.log("🔐 Verificando autenticación...");
    console.log("Token presente:", !!token);
    console.log("Rol de usuario:", userRole);

    if (!token) {
      console.error("❌ No hay token, redirigiendo al login");
      navigate("/");
      return;
    }

    if (userRole !== "admin") {
      console.error("❌ Usuario no es admin, redirigiendo a home");
      navigate("/home");
      return;
    }

    console.log("✅ Autenticación verificada, cargando datos...");
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("No hay token de autenticación");
        navigate("/");
        return;
      }

      const userRole = localStorage.getItem("userRole");
      if (userRole !== "admin") {
        console.error("Usuario no es admin:", userRole);
        navigate("/home");
        return;
      }

      console.log("🔍 Fetching admin stats...");

      // Fetch stats
      const statsResponse = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📊 Stats response status:", statsResponse.status);
      console.log("📊 Stats content-type:", statsResponse.headers.get("content-type"));

      if (statsResponse.status === 401 || statsResponse.status === 403) {
        console.error("❌ No autorizado, redirigiendo al login");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      // Verificar que la respuesta es JSON
      const contentType = statsResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await statsResponse.text();
        console.error("❌ Respuesta stats no es JSON:", text.substring(0, 200));
        throw new Error(
          `La API devolvió HTML en lugar de JSON. Verifica que la ruta /api/admin/stats esté correctamente configurada en tu servidor. Estado: ${statsResponse.status}`
        );
      }

      if (!statsResponse.ok) {
        const errorData = await statsResponse.json();
        console.error("❌ Error en stats:", errorData);
        throw new Error(errorData.error || `Error al cargar estadísticas: ${statsResponse.status}`);
      }

      const statsData = await statsResponse.json();
      console.log("✅ Stats data recibida:", statsData);
      setStats(statsData.data || statsData);

      console.log("🔍 Fetching admin users...");

      // Fetch users
      const usersResponse = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("👥 Users response status:", usersResponse.status);
      console.log("👥 Users content-type:", usersResponse.headers.get("content-type"));

      if (usersResponse.status === 401 || usersResponse.status === 403) {
        console.error("❌ No autorizado para ver usuarios");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      // Verificar que la respuesta es JSON
      const usersContentType = usersResponse.headers.get("content-type");
      if (!usersContentType || !usersContentType.includes("application/json")) {
        const text = await usersResponse.text();
        console.error("❌ Respuesta users no es JSON:", text.substring(0, 200));
        throw new Error(
          `La API devolvió HTML en lugar de JSON. Verifica que la ruta /api/admin/users esté correctamente configurada. Estado: ${usersResponse.status}`
        );
      }

      if (!usersResponse.ok) {
        const errorData = await usersResponse.json();
        console.error("❌ Error en users:", errorData);
        throw new Error(errorData.error || `Error al cargar usuarios: ${usersResponse.status}`);
      }

      const usersData = await usersResponse.json();
      console.log("✅ Users data recibida:", usersData);

      // Asegurarnos de que cada usuario tenga el campo 'id' además de 'userId'
      const rawUsers = usersData.data || usersData;
      const formattedUsers = rawUsers.map((user: any) => ({
        ...user,
        id: user.id || user.userId?.toString() || String(user.userId),
      }));

      console.log("✅ Usuarios formateados:", formattedUsers.length);
      setUsers(formattedUsers);
    } catch (err) {
      console.error("❌ Error en fetchAdminData:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      // Usar userId en lugar de id para la petición
      const userIdToDelete = selectedUser.userId || selectedUser.id;

      const response = await fetch(`/api/admin/users/${userIdToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Respuesta no es JSON:", text);
        throw new Error("Error: La API devolvió HTML en lugar de JSON");
      }

      if (!response.ok) {
        throw new Error("Error al eliminar usuario");
      }

      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar usuario");
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleUpdateStorage = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      // Validación básica
      const parsedLimit = Number(newStorageLimit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        toast({
          title: "⚠️ Límite inválido",
          description: "Debes ingresar un número válido mayor a 0.",
          variant: "destructive",
        });
        return;
      }

      const userId = selectedUser.userId || selectedUser.id;

      const response = await fetch(`/api/admin/users/${userId}/storage`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storageLimit: parsedLimit }),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Respuesta no es JSON:", text);
        throw new Error("La API devolvió HTML en lugar de JSON");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar almacenamiento");
      }

      // Actualizar usuarios en local
      setUsers((prev) => prev.map((u) => (u.userId === selectedUser.userId ? { ...u, storageLimit: parsedLimit } : u)));

      setShowStorageDialog(false);
      setSelectedUser(null);

      toast({
        title: "✅ Almacenamiento actualizado",
        description: `Nuevo límite: ${parsedLimit} GB`,
      });
    } catch (err) {
      console.error("Error al actualizar almacenamiento:", err);
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar almacenamiento";
      setError(errorMsg);
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Respuesta no es JSON:", text);
        throw new Error("Error: La API devolvió HTML en lugar de JSON");
      }

      if (!response.ok) {
        throw new Error("Error al suspender usuario");
      }

      await fetchAdminData();

      toast({
        title: "✅ Estado actualizado",
        description: "El estado del usuario ha sido cambiado correctamente.",
      });
    } catch (err) {
      console.error("Error al suspender usuario:", err);
      const errorMsg = err instanceof Error ? err.message : "Error al suspender usuario";
      setError(errorMsg);
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await fetch("/api/admin/export", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Error al exportar datos");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nuvia-export-${new Date().toISOString()}.csv`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar datos");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || user.status === filterStatus;

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
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">Control total del sistema Nuvia</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => fetchAdminData()}
                variant="outline"
                className="flex-1 sm:flex-none border-white/20 text-white hover:bg-white/10 text-sm sm:text-base">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              <Button
                onClick={handleExportData}
                className="flex-1 sm:flex-none bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:shadow-nuvia-glow text-sm sm:text-base">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs para diferentes secciones */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full bg-white/80 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg py-2"
            >
              <Database className="w-4 h-4 mr-2" />
              Resumen
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg py-2"
            >
              <Users className="w-4 h-4 mr-2" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger 
              value="storage" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white transition-all duration-300 rounded-lg py-2"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              Almacenamiento
            </TabsTrigger>
          </TabsList>

          {/* Pestaña: Resumen */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Total Usuarios</p>
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

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Almacenamiento Total</p>
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
                          width: `${Math.min((stats.usedStorage / stats.totalStorage) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Total Multimedia</p>
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

              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Subidas Hoy</p>
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

          {/* Pestaña: Usuarios (mantiene la tabla completa) */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-nuvia-mauve flex-shrink-0" />
                      <span className="truncate">Gestión de Usuarios</span>
                      <Badge variant="secondary" className="ml-2 bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                        {sortedUsers.length}
                      </Badge>
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nuvia-deep/40" />
                      <Input
                        placeholder="Buscar usuarios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/50 border-nuvia-silver/30 text-sm"
                      />
                    </div>
                  </div>

                  {/* Filtros y ordenamiento */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full bg-white/50 border-nuvia-silver/30">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="active">Activos</SelectItem>
                          <SelectItem value="suspended">Suspendidos</SelectItem>
                          <SelectItem value="inactive">Inactivos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full bg-white/50 border-nuvia-silver/30">
                          <ArrowUpDown className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt">Fecha de registro</SelectItem>
                          <SelectItem value="username">Nombre de usuario</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="storageUsed">Almacenamiento usado</SelectItem>
                          <SelectItem value="totalImages">Número de imágenes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="bg-white/50 border-nuvia-silver/30">
                      <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-nuvia-silver/20">
                        <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap">Usuario</TableHead>
                        <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden md:table-cell">
                          Email
                        </TableHead>
                        <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap">Estado</TableHead>
                        <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden lg:table-cell">
                          Multimedia
                        </TableHead>
                        <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden xl:table-cell">
                          Almacenamiento
                        </TableHead>
                        <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden xl:table-cell">
                          Último Acceso
                        </TableHead>
                        <TableHead className="text-nuvia-deep/70 text-xs md:text-sm text-right whitespace-nowrap">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-nuvia-deep/60 text-sm">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-nuvia-mauve" />
                                <span>Cargando datos...</span>
                              </div>
                              <p className="text-xs text-nuvia-deep/40">Obteniendo información de usuarios</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : sortedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-nuvia-deep/60">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Users className="w-12 h-12 text-nuvia-silver/40" />
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {searchTerm || filterStatus !== "all"
                                    ? "No se encontraron usuarios con los filtros aplicados"
                                    : "No hay usuarios registrados"}
                                </p>
                                {(searchTerm || filterStatus !== "all") && (
                                  <p className="text-sm text-nuvia-deep/40">
                                    Intenta con otros términos o ajusta los filtros
                                  </p>
                                )}
                              </div>
                              {(searchTerm || filterStatus !== "all") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSearchTerm("");
                                    setFilterStatus("all");
                                  }}
                                  className="mt-2">
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Limpiar filtros
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedUsers.map((user) => (
                          <TableRow
                            key={user.id}
                            className="border-nuvia-silver/10 hover:bg-nuvia-peach/5 transition-colors duration-150">
                            <TableCell className="font-medium text-nuvia-deep">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center border border-nuvia-silver/30">
                                  <span className="text-sm font-semibold text-nuvia-deep">
                                    {user.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="max-w-[120px] md:max-w-[150px] truncate text-sm font-medium">
                                    {user.username}
                                  </div>
                                  <div className="text-xs text-nuvia-deep/60 md:hidden truncate">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-nuvia-deep/70 text-sm hidden md:table-cell">
                              <div className="max-w-[180px] lg:max-w-[220px] truncate flex items-center gap-2">
                                <span>{user.email}</span>
                                {user.role === "admin" && (
                                  <Badge className="bg-gradient-nuvia-royal text-[10px] px-1.5 py-0 border-0">Admin</Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    user.status === "active"
                                      ? "bg-green-500"
                                      : user.status === "suspended"
                                      ? "bg-red-500"
                                      : "bg-gray-500"
                                  }`}
                                />
                                <Badge
                                  className={`${getStatusColor(user.status)} text-xs whitespace-nowrap px-2 py-1 border`}>
                                  {getStatusText(user.status)}
                                </Badge>
                              </div>
                            </TableCell>

                            <TableCell className="text-nuvia-deep/70 hidden lg:table-cell">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <div className="p-1.5 rounded-md bg-nuvia-mauve/10">
                                    <Image className="w-3.5 h-3.5 text-nuvia-mauve" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{user.totalImages}</div>
                                    <div className="text-[10px] text-nuvia-deep/50">Imágenes</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="p-1.5 rounded-md bg-nuvia-rose/10">
                                    <Video className="w-3.5 h-3.5 text-nuvia-rose" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{user.totalVideos}</div>
                                    <div className="text-[10px] text-nuvia-deep/50">Videos</div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-nuvia-deep/70 hidden xl:table-cell">
                              <div className="space-y-2 min-w-[120px]">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium">
                                    {user.storageUsed.toFixed(1)} / {user.storageLimit} GB
                                  </span>
                                  <span className="text-xs text-nuvia-deep/60">
                                    {Math.round((user.storageUsed / user.storageLimit) * 100)}%
                                  </span>
                                </div>
                                <div className="w-full bg-nuvia-silver/20 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min((user.storageUsed / user.storageLimit) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] text-nuvia-deep/50">
                                  <span>Disponible: {(user.storageLimit - user.storageUsed).toFixed(1)} GB</span>
                                  <span
                                    className={`${
                                      user.storageUsed / user.storageLimit > 0.8 ? "text-red-500 font-medium" : ""
                                    }`}>
                                    {user.storageUsed / user.storageLimit > 0.8 && "⚠️ Límite cercano"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-nuvia-deep/70 text-sm hidden xl:table-cell">
                              <div className="space-y-1">
                                <div className="font-medium">{formatDate(user.lastLogin)}</div>
                                <div className="text-xs text-nuvia-deep/50 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(user.lastLogin).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                                <div className="text-[10px] text-nuvia-deep/30">
                                  Desde registro: {formatDate(user.createdAt)}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewUser(user)}
                                  className="h-8 w-8 hover:bg-nuvia-peach/20"
                                  title="Ver detalles">
                                  <Eye className="h-4 w-4 text-nuvia-deep/70" />
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-nuvia-peach/20">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                      <span>{user.username}</span>
                                      {user.role === "admin" && (
                                        <Badge variant="outline" className="ml-auto text-[10px]">
                                          Admin
                                        </Badge>
                                      )}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem onClick={() => handleViewUser(user)} className="cursor-pointer">
                                      <Eye className="mr-2 h-4 w-4" />
                                      <span>Ver detalles completos</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setNewStorageLimit(user.storageLimit.toString());
                                        setShowStorageDialog(true);
                                      }}
                                      className="cursor-pointer">
                                      <HardDrive className="mr-2 h-4 w-4" />
                                      <div className="flex-1">
                                        <div>Cambiar almacenamiento</div>
                                        <div className="text-xs text-nuvia-deep/60">Actual: {user.storageLimit} GB</div>
                                      </div>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleSuspendUser(user.userId?.toString() || user.id)}
                                      className={`cursor-pointer ${
                                        user.status === "active"
                                          ? "text-amber-600 hover:text-amber-700"
                                          : "text-green-600 hover:text-green-700"
                                      }`}>
                                      <UserX className="mr-2 h-4 w-4" />
                                      {user.status === "active" ? "Suspender usuario" : "Reactivar usuario"}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={() => {
                                        // Función para copiar email al portapapeles
                                        navigator.clipboard.writeText(user.email);
                                        toast({
                                          title: "✅ Email copiado",
                                          description: `Email de ${user.username} copiado al portapapeles`,
                                        });
                                      }}
                                      className="cursor-pointer">
                                      <Copy className="mr-2 h-4 w-4" />
                                      Copiar email
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowDeleteDialog(true);
                                      }}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar usuario permanentemente
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña: Almacenamiento (con StorageIndicator) */}
          <TabsContent value="storage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* StorageIndicator para vista general del sistema */}
              <StorageIndicator 
                variant="detailed" 
                showRefresh={true}
                showBreakdown={true}
              />

              {/* Vista de usuarios con mayor uso de almacenamiento */}
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
                        <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-nuvia-silver/20 bg-white/50">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-nuvia-deep">{index + 1}</span>
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
                                  width: `${Math.min((user.storageUsed / user.storageLimit) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
                      <div className="text-sm font-medium text-green-800">Total Almacenamiento</div>
                      <div className="text-2xl font-bold text-green-900">{stats.totalStorage} GB</div>
                      <div className="text-xs text-green-700">Límite total del sistema</div>
                    </div>
                    <div className="p-4 rounded-lg border border-nuvia-mauve/30 bg-nuvia-mauve/10">
                      <div className="text-sm font-medium text-nuvia-mauve">Almacenamiento Usado</div>
                      <div className="text-2xl font-bold text-nuvia-mauve">{stats.usedStorage.toFixed(1)} GB</div>
                      <div className="text-xs text-nuvia-mauve">
                        {Math.round((stats.usedStorage / stats.totalStorage) * 100)}% del total
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Diálogos (se mantienen igual) */}
        {/* User Details Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Detalles del Usuario</DialogTitle>
              <DialogDescription className="text-sm">
                Información completa de {selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Usuario</p>
                    <p className="text-sm md:text-base text-nuvia-deep break-words">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Email</p>
                    <p className="text-sm md:text-base text-nuvia-deep break-all">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Rol</p>
                    <Badge className="text-xs">{selectedUser.role}</Badge>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Estado</p>
                    <Badge className={`${getStatusColor(selectedUser.status)} text-xs`}>
                      {getStatusText(selectedUser.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Imágenes</p>
                    <p className="text-sm md:text-base text-nuvia-deep">{selectedUser.totalImages}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Videos</p>
                    <p className="text-sm md:text-base text-nuvia-deep">{selectedUser.totalVideos}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Almacenamiento</p>
                    <p className="text-sm md:text-base text-nuvia-deep">
                      {selectedUser.storageUsed} / {selectedUser.storageLimit} GB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Registro</p>
                    <p className="text-sm md:text-base text-nuvia-deep">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">¿Eliminar usuario?</DialogTitle>
              <DialogDescription className="text-sm">
                Esta acción no se puede deshacer. Se eliminarán todos los datos del usuario
                <strong className="text-nuvia-deep"> {selectedUser?.username}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                className="w-full sm:w-auto bg-red-500 hover:bg-red-600">
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Storage Limit Dialog */}
        <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Cambiar límite de almacenamiento</DialogTitle>
              <DialogDescription className="text-sm">
                Actualizar el límite de almacenamiento para{" "}
                <strong className="text-nuvia-deep">{selectedUser?.username}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="storageLimit">Nuevo límite (GB)</Label>
                <Input
                  id="storageLimit"
                  type="number"
                  min="1"
                  step="0.5"
                  value={newStorageLimit}
                  onChange={(e) => setNewStorageLimit(e.target.value)}
                  placeholder="Ej: 10"
                  className="w-full"
                />
                <p className="text-xs text-nuvia-deep/60">
                  Actualmente: {selectedUser?.storageUsed.toFixed(2)} GB / {selectedUser?.storageLimit} GB
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStorageDialog(false);
                  setNewStorageLimit("");
                }}
                className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateStorage}
                disabled={!newStorageLimit || parseFloat(newStorageLimit) < 1}
                className="w-full sm:w-auto bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:shadow-nuvia-glow">
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Admin;